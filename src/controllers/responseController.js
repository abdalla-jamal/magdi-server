const Response = require('../models/response_model.js');
const Survey = require('../models/SurveyModel');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// إعداد التخزين للملفات الصوتية
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '../../uploads');
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    console.log('Saving file to:', uploadsDir);
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + '-' + file.originalname;
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});
const upload = multer({ storage: storage });

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
            console.log(`Found file for question ${ans.questionId}:`, file.filename);
            console.log(`File path: ${path.join(__dirname, '../../uploads', file.filename)}`);
            // تأكد من وجود الملف
            const filePath = path.join(__dirname, '../../uploads', file.filename);
            if (fs.existsSync(filePath)) {
              console.log(`File exists at: ${filePath}`);
            } else {
              console.log(`WARNING: File does not exist at: ${filePath}`);
            }
            // حتى لو answer غير موجود أو فارغ، احفظ اسم الملف
            return { ...ans, answer: file.filename };
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