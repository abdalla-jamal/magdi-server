const Response = require('../models/response_model.js');
const Survey = require('../models/SurveyModel');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || '123456789012345',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'abcdefghijklmnopqrstuvwxyz12',
});

// Setup Cloudinary storage for audio files
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'survey_audio',
    resource_type: 'video', // Important: Cloudinary requires audio to be uploaded as "video"
    format: 'auto', // Let Cloudinary handle the format conversion
    public_id: (req, file) => `audio_${Date.now()}_${Math.round(Math.random() * 1E9)}`,
  },
});

// طباعة معلومات Cloudinary للتشخيص
console.log('Cloudinary configuration:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo (default)',
  api_key: process.env.CLOUDINARY_API_KEY ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : 'not set',
  api_secret: process.env.CLOUDINARY_API_SECRET ? '***' + process.env.CLOUDINARY_API_SECRET.slice(-4) : 'not set',
});

// Always use Cloudinary for audio uploads
console.log('Using Cloudinary storage for voice recordings');
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// التحقق من اتصال Cloudinary عند بدء السيرفر
console.log('Checking Cloudinary configuration at startup');
try {
  cloudinary.api.ping((error, result) => {
    if (error) {
      console.error('Cloudinary connection failed:', error);
    } else {
      console.log('Cloudinary connection successful:', result);
    }
  });
} catch (err) {
  console.error('Error checking Cloudinary connection:', err);
}

/**
 * Submit a survey response
 * Handles both regular form submissions and multipart form data with voice recordings
 */
const submitResponse = async (req, res) => {
  try {
    console.log("Request received:", req.method, req.path);
    console.log("Content-Type:", req.headers['content-type']);
    console.log("Request body keys:", req.body ? Object.keys(req.body) : "No body");
    
    // إذا كان الطلب من نوع form-data (ملفات وصوت)
    let answers, surveyId, name, email;
    if (req.is('multipart/form-data')) {
      console.log("Processing multipart form data");
      console.log("Body:", req.body);
      console.log("Files:", req.files ? `${req.files.length} files received` : "No files");
      
      if (req.files) {
        req.files.forEach((file, index) => {
          console.log(`File ${index + 1}:`, {
            fieldname: file.fieldname,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path || 'No path'
          });
        });
      }
      
      surveyId = req.body.surveyId;
      name = req.body.name || '';
      email = req.body.email || '';
      
      // Verify we have the answers field
      if (!req.body.answers) {
        console.error("Missing answers field in request body");
        return res.status(400).json({ error: 'Missing answers field in request body' });
      }
      
      try {
        answers = JSON.parse(req.body.answers || '[]');
        console.log("Parsed answers:", answers);
      } catch (parseError) {
        console.error("Error parsing answers JSON:", parseError, "Raw answers:", req.body.answers);
        return res.status(400).json({ error: 'Invalid answers JSON format', details: parseError.message });
      }
      
      // ربط ملفات الصوت بالإجابات
      if (req.files && req.files.length > 0) {
        answers = answers.map(ans => {
          const file = req.files ? req.files.find(f => f.fieldname === `voiceAnswer_${ans.questionId}`) : null;
          if (file) {
            console.log(`Found voice file for question ${ans.questionId}:`, file);
            
            // Get the Cloudinary URL from the file path
            const fileUrl = file.path;
            console.log('Cloudinary URL:', fileUrl);
            
            // إضافة رابط الصوت وعلامة hasVoiceFile
            return { 
              ...ans, 
              answer: fileUrl, 
              hasVoiceFile: true,
              voiceUrl: fileUrl // إضافة حقل إضافي للرابط
            };
          }
          console.log(`No voice file for question ${ans.questionId}, keeping original answer:`, ans.answer);
          return ans;
        });
      }
      
      // تأكد من طباعة الإجابات النهائية للتحقق
      console.log("Final answers with voice files:", JSON.stringify(answers, null, 2));

      // Check for invalid answers, but allow empty answers if they have voice files
      const invalidAnswers = answers.filter(ans => {
        const hasVoiceFile = req.files && req.files.some(f => f.fieldname === `voiceAnswer_${ans.questionId}`);
        return (!ans.answer || ans.answer === "") && !hasVoiceFile;
      });
      if (invalidAnswers.length > 0) {
        // تحقق إذا فيه ملف صوت مرتبط بالإجابة
        const hasVoiceFile = invalidAnswers.some(ans => req.files && req.files.find(f => f.fieldname === `voiceAnswer_${ans.questionId}`));
        if (!hasVoiceFile) {
          return res.status(400).json({ error: "All answers must have a value (text or file URL)." });
        }
      }

      // Debug: log final answers array
      console.log("Final answers array before saving:", answers);
    } else {
      // إذا كان الطلب JSON عادي
      console.log("Processing JSON request");
      ({ surveyId, answers, name, email } = req.body);
    }

    // Validate required fields
    if (!surveyId) {
      return res.status(400).json({ error: 'surveyId is required' });
    }
    
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'answers must be an array' });
    }
    
    if (answers.length === 0) {
      return res.status(400).json({ error: 'answers array must not be empty' });
    }
    
    // We'll check name and email requirements after fetching the survey category

    // Validate surveyId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(surveyId)) {
      return res.status(400).json({ error: 'Invalid surveyId format' });
    }

    // Check if survey exists and is open
    const survey = await Survey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    if (survey.status !== 'open') {
      return res.status(400).json({ error: 'Survey is not open for responses' });
    }

    // Require name and email only if category is 'staff'
    if (survey.category === 'staff') {
      if (!name || !email) {
        return res.status(400).json({ error: 'name and email are required for staff surveys' });
      }
    }
    // For 'other' category, name and email are optional

    // Validate reasons for answers if required by question
    const questionMap = {};
    survey.questions.forEach(q => { questionMap[q._id.toString()] = q; });
    for (const ans of answers) {
      const q = questionMap[ans.questionId];
      if (q && q.requireReason && (q.type === 'radio' || q.type === 'checkbox')) {
        if (!ans.reason || typeof ans.reason !== 'string' || ans.reason.trim() === '') {
          return res.status(400).json({ error: `Reason is required for question: ${q.questionText}` });
        }
      }
    }

    // أمان إضافي: تأكد أن كل إجابة فيها answer على الأقل ""
    answers = answers.map(ans => {
      // Ensure questionId is a valid ObjectId
      if (!ans.questionId || !mongoose.Types.ObjectId.isValid(ans.questionId)) {
        console.error(`Invalid questionId: ${ans.questionId}`);
        throw new Error(`Invalid questionId format: ${ans.questionId}`);
      }
      
      // حفظ معلومات الصوت بشكل صحيح
      const isVoiceAnswer = ans.hasVoiceFile || 
                           ans.type === "voice" ||
                           (typeof ans.answer === 'string' && 
                            (ans.answer.includes('cloudinary.com') || 
                             ans.answer.includes('res.cloudinary.com') ||
                             ans.answer.includes('survey_audio')));
      
      return {
        questionId: ans.questionId,
        answer: typeof ans.answer === 'undefined' || ans.answer === '' ? 
                (isVoiceAnswer ? '' : 'No response provided') : 
                ans.answer,
        reason: ans.reason || undefined,
        hasVoiceFile: isVoiceAnswer,
        voiceUrl: isVoiceAnswer ? (ans.voiceUrl || ans.answer) : undefined
      };
    });
    
    // تأكد من طباعة الإجابات النهائية للتحقق
    console.log("Final answers before saving:", JSON.stringify(answers, null, 2));

    // Debug logs before saving
    console.log('answers before save:', answers);
    console.log('req.files:', req.files);
    console.log('surveyId:', surveyId, 'name:', name, 'email:', email);

    // Debug: Print answers before saving
    console.log("answers before save:", JSON.stringify(answers, null, 2));

    // طباعة معلومات الإجابات قبل الحفظ للتشخيص
    console.log("Final answers structure before saving to DB:", JSON.stringify(answers, null, 2));
    
    // تأكد من أن كل إجابة صوتية تحتوي على حقل hasVoiceFile وvoiceUrl
    const processedAnswers = answers.map(ans => {
      if (typeof ans.answer === 'string' && 
          (ans.answer.includes('cloudinary.com') || 
           ans.answer.includes('res.cloudinary.com') ||
           ans.answer.includes('survey_audio'))) {
        return {
          ...ans,
          hasVoiceFile: true,
          voiceUrl: ans.voiceUrl || ans.answer
        };
      }
      return ans;
    });
    
    const newResponse = new Response({
      surveyId,
      answers: processedAnswers,
      name,
      email
    });
    
    console.log("Saving response with processed answers:", JSON.stringify(processedAnswers, null, 2));
    
    await newResponse.save();
    res.status(201).json({ message: 'Response submitted successfully', response: newResponse });
  } catch (error) {
    console.error("Error in submitResponse:", error.message);
    console.error("Stack trace:", error.stack);
    
    // Check for specific Cloudinary errors
    if (error.message && (error.message.includes('Cloudinary') || error.message.includes('cloud'))) {
      console.error("Cloudinary error detected:", error.message);
      return res.status(500).json({ 
        error: 'Failed to upload voice recording to cloud storage', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
    
    // Check for file size errors
    if (error.message && error.message.includes('size')) {
      console.error("File size error detected");
      return res.status(413).json({ 
        error: 'Voice recording file too large', 
        details: error.message
      });
    }
    
    // General error handling
    res.status(500).json({ 
      error: 'Failed to submit response', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Get responses for a specific survey
 */
const getResponsesBySurvey = async (req, res) => {
  try {
    const { surveyId } = req.params;
    const { page = 1, limit = 6 } = req.query;
    
    // Convert to numbers and validate
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive numbers' });
    }
    
    // Validate surveyId
    let query = {};
    if (surveyId === 'all') {
      // If surveyId is 'all', get responses from all surveys
      query = {};
    } else {
      // Validate if surveyId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(surveyId)) {
        return res.status(400).json({ error: 'Invalid survey ID format' });
      }
      query = { surveyId };
    }
    
    // Calculate skip value for pagination
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count for pagination metadata
    const totalResponses = await Response.countDocuments(query);
    const totalPages = Math.ceil(totalResponses / limitNum);
    
    // Get paginated responses
    const responses = await Response.find(query)
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limitNum);
    
    // Prepare pagination metadata
    const pagination = {
      currentPage: pageNum,
      totalPages,
      totalResponses,
      responsesPerPage: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    };
    
    res.status(200).json({
      responses,
      pagination
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
};

/**
 * Upload a voice recording for a survey question
 * This is a dedicated endpoint for voice uploads
 */
const uploadVoiceResponse = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No voice file uploaded' });
    }

    console.log("Voice file received:", {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path || 'No path',
      filename: req.file.filename || 'No filename'
    });

    // Get questionId from request body or try to extract from fieldname
    let questionId;
    
    // First check if questionId is in the request body
    if (req.body && req.body.questionId) {
      console.log("Found questionId in request body:", req.body.questionId);
      questionId = req.body.questionId;
    } 
    // Then try to extract from fieldname (format: voiceAnswer_QUESTION_ID)
    else {
      console.log("Trying to extract questionId from fieldname:", req.file.fieldname);
      const questionIdMatch = req.file.fieldname.match(/voiceAnswer_([a-f0-9]+)/i);
      if (questionIdMatch && questionIdMatch[1]) {
        questionId = questionIdMatch[1];
        console.log("Extracted questionId from fieldname:", questionId);
      } else {
        // If no questionId found, check if we have a field named voiceFile
        if (req.file.fieldname === 'voiceFile') {
          // Look for questionId in other form fields
          if (req.body && req.body.questionId) {
            questionId = req.body.questionId;
            console.log("Using questionId from form field:", questionId);
          } else {
            return res.status(400).json({ 
              error: 'Missing questionId. Please provide questionId in the request body.' 
            });
          }
        } else {
          return res.status(400).json({ 
            error: 'Invalid fieldname format. Expected voiceAnswer_QUESTION_ID or voiceFile with questionId parameter' 
          });
        }
      }
    }
    
    // Validate questionId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ error: 'Invalid questionId format' });
    }
    
    // Get the Cloudinary URL from the file path
    const voiceUrl = req.file.path;
    console.log('Cloudinary URL:', voiceUrl);

    // Return the URL and question ID
    res.status(200).json({
      success: true,
      data: {
        questionId,
        voiceUrl: voiceUrl,
        mimetype: req.file.mimetype,
        size: req.file.size,
        storage: 'cloudinary'
      }
    });
  } catch (error) {
    console.error("Error uploading voice:", error);
    // Log more detailed information for debugging
    if (error.code === 'ENOENT') {
      console.error("File not found error. This often happens when trying to access a file that doesn't exist.");
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        error: 'File too large',
        details: 'The uploaded file exceeds the size limit.'
      });
    }
    
    // Send a more detailed error response
    res.status(500).json({ 
      error: 'Failed to upload voice recording',
      details: error.message,
      code: error.code || 'UNKNOWN',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  getResponsesBySurvey,
  submitResponse,
  uploadVoiceResponse,
  upload
};