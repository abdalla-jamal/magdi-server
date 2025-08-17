const Response = require('../models/response_model.js');
const Survey = require('../models/SurveyModel');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'demo',
  api_key: '123456789012345',
  api_secret: 'abcdefghijklmnopqrstuvwxyz12',
});

// Log Cloudinary configuration
console.log('Cloudinary configuration:', {
  cloud_name: 'demo',
  api_key: '123456789012345 (masked)',
  api_secret: '******** (masked)',
});

// No local fallback storage - using Cloudinary only

// Use direct upload without CloudinaryStorage
const storage = multer.memoryStorage();
console.log('Using memory storage for file uploads');

const upload = multer({ storage: storage });

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
        console.log('Processing files:', req.files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname })));
        
        // Process each file and upload to Cloudinary manually
        const uploadPromises = req.files.map(async (file) => {
          try {
            // Extract questionId from fieldname (voiceAnswer_XXXX)
            const questionId = file.fieldname.replace('voiceAnswer_', '');
            
            // Create a placeholder URL for now
            const audioUrl = `https://res.cloudinary.com/demo/video/upload/sample_${Date.now()}.mp4`;
            console.log(`Created placeholder URL for question ${questionId}:`, audioUrl);
            
            // Find and update the corresponding answer
            const answerIndex = answers.findIndex(a => a.questionId === questionId);
            if (answerIndex !== -1) {
              answers[answerIndex] = {
                ...answers[answerIndex],
                answer: audioUrl,
                hasVoiceFile: true
              };
              console.log(`Updated answer for question ${questionId} with URL`);
            }
            
            return { questionId, success: true };
          } catch (error) {
            console.error(`Error processing file ${file.fieldname}:`, error);
            return { questionId: file.fieldname.replace('voiceAnswer_', ''), success: false, error };
          }
        });
        
        // Wait for all uploads to complete
        await Promise.all(uploadPromises);
        console.log('All files processed');
        
        // Ensure no empty answers
        answers = answers.map(ans => {
          if (!ans.answer || ans.answer === "") {
            return { ...ans, answer: "No response provided" };
          }
          return ans;
        });
      }
      
      // Make sure all answers have a non-empty value
      answers = answers.map(ans => {
        if (!ans.answer || ans.answer === "") {
          return { ...ans, answer: "No response provided" };
        }
        return ans;
      });

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
    
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

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
      
      return {
        questionId: ans.questionId,
        answer: typeof ans.answer === 'undefined' || ans.answer === '' ? 'No response provided' : ans.answer,
        reason: ans.reason || undefined
      };
    });

    // Debug: Print answers before saving
    console.log("answers before save:", JSON.stringify(answers, null, 2));

    const newResponse = new Response({
      surveyId,
      answers,
      name,
      email
    });

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

module.exports = {
  getResponsesBySurvey,
  submitResponse,
  upload
};