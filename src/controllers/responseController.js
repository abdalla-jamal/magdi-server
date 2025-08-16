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
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your_cloud_name',
  api_key: process.env.CLOUDINARY_API_KEY || 'your_api_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your_api_secret',
});

// Setup Cloudinary storage for audio files
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'survey_audio',
    resource_type: 'auto', // Automatically detect file type
    format: 'webm', // For audio files from browser recording
    public_id: (req, file) => `audio_${Date.now()}_${Math.round(Math.random() * 1E9)}`,
  },
});

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
    
    // إذا كان الطلب من نوع form-data (ملفات وصوت)
    let answers, surveyId, name, email;
    if (req.is('multipart/form-data')) {
      console.log("Processing multipart form data");
      console.log("Body:", req.body);
      console.log("Files:", req.files ? req.files.length : "No files");
      
      surveyId = req.body.surveyId;
      name = req.body.name;
      email = req.body.email;
      
      try {
        answers = JSON.parse(req.body.answers || '[]');
        console.log("Parsed answers:", answers);
      } catch (parseError) {
        console.error("Error parsing answers JSON:", parseError);
        return res.status(400).json({ error: 'Invalid answers JSON format', details: parseError.message });
      }
      
      // ربط ملفات الصوت بالإجابات
      if (req.files && req.files.length > 0) {
        console.log("Processing files:", req.files.map(f => f.fieldname));
        
        answers = answers.map(ans => {
          // ابحث عن ملف صوتي باسم voiceAnswer_<questionId>
          const file = req.files.find(f => f.fieldname === `voiceAnswer_${ans.questionId}`);
          if (file) {
            console.log(`Found file for question ${ans.questionId}:`, file.path);
            
            // استخدم رابط Cloudinary المرجعي للملف
            const cloudinaryUrl = file.path;
            console.log(`Cloudinary URL: ${cloudinaryUrl}`);
            
            // حتى لو answer غير موجود أو فارغ، احفظ رابط Cloudinary
            return { ...ans, answer: cloudinaryUrl };
          }
          // لو الإجابة نصية أو عادية
          return ans;
        });
      }
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

    // أمان إضافي: تأكد أن كل إجابة فيها answer على الأقل ""
    answers = answers.map(ans => {
      // Ensure questionId is a valid ObjectId
      if (!ans.questionId || !mongoose.Types.ObjectId.isValid(ans.questionId)) {
        console.error(`Invalid questionId: ${ans.questionId}`);
        throw new Error(`Invalid questionId format: ${ans.questionId}`);
      }
      
      return {
        questionId: ans.questionId,
        answer: typeof ans.answer === 'undefined' ? '' : ans.answer
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