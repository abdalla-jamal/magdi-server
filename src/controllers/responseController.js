const Response = require('../models/response_model.js');
const Survey = require('../models/SurveyModel');
const Category = require('../models/CategoryModel');
const mongoose = require('mongoose');
const multer = require('multer');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { s3, PutObjectCommand, getS3PublicUrl, BUCKET } = require('../utils/s3');

// Load environment variables
dotenv.config();

// Setup multer for local file handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// S3 upload controller
const uploadToS3 = async (req, res) => {
  try {
    // Log request info for debugging
    console.log('S3 upload request received:', {
      contentType: req.headers['content-type'],
      hasFile: !!req.file,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      bodyFields: Object.keys(req.body || {})
    });
    
    // Check for required AWS env vars
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_BUCKET_NAME || !process.env.AWS_REGION) {
      console.error('Missing AWS S3 environment variables:', {
        AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
        AWS_BUCKET_NAME: !!process.env.AWS_BUCKET_NAME,
        AWS_REGION: !!process.env.AWS_REGION,
      });
      return res.status(500).json({ error: 'AWS S3 credentials or config missing from environment variables.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const file = req.file;
    const ext = file.originalname.split('.').pop();
    // Create a more descriptive filename that includes questionId if available
    const questionId = req.body.questionId || 'unknown';
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1E9);
    const filename = `records/${timestamp}_${questionId}_${randomId}.${ext}`;
    const params = {
      Bucket: BUCKET,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
    };
    await s3.send(new PutObjectCommand(params));
    const url = getS3PublicUrl(filename);
    return res.status(200).json({ url });
  } catch (err) {
    console.error('S3 upload error:', err, err.stack);
    return res.status(500).json({ error: 'Failed to upload file', details: err.message, stack: err.stack });
  }
};

/**
 * Submit a survey response
 * Handles both regular form submissions and multipart form data with voice recordings
 */
const submitResponse = async (req, res) => {
  try {
    let answers, surveyId, name, email;
    if (req.is('multipart/form-data')) {
      // Only parse fields, do not process files
      surveyId = req.body.surveyId;
      name = req.body.name || '';
      email = req.body.email || '';
      if (!req.body.answers) {
        return res.status(400).json({ error: 'Missing answers field in request body' });
      }
      try {
        answers = JSON.parse(req.body.answers || '[]');
      } catch (parseError) {
        return res.status(400).json({ error: 'Invalid answers JSON format', details: parseError.message });
      }
    } else {
      ({ surveyId, answers, name, email } = req.body);
    }
    if (!surveyId) {
      return res.status(400).json({ error: 'surveyId is required' });
    }
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'answers must be an array' });
    }
    if (answers.length === 0) {
      return res.status(400).json({ error: 'answers array must not be empty' });
    }
    if (!mongoose.Types.ObjectId.isValid(surveyId)) {
      return res.status(400).json({ error: 'Invalid surveyId format' });
    }
    const survey = await Survey.findById(surveyId).populate('category', 'name settings');
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    if (survey.status !== 'open') {
      return res.status(400).json({ error: 'Survey is not open for responses' });
    }
    
    // Validate name and email based on category settings
    if (survey.category && survey.category.settings) {
      const { nameRequired, emailRequired } = survey.category.settings;
      
      if (nameRequired && (!name || name.trim() === '')) {
        return res.status(400).json({ 
          error: 'Name is required for this survey category',
          field: 'name'
        });
      }
      
      if (emailRequired && (!email || email.trim() === '')) {
        return res.status(400).json({ 
          error: 'Email is required for this survey category',
          field: 'email'
        });
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
    // Only accept S3 URLs for voice answers
    answers = answers.map(ans => {
      if (!ans.questionId || !mongoose.Types.ObjectId.isValid(ans.questionId)) {
        throw new Error(`Invalid questionId format: ${ans.questionId}`);
      }
      const isVoiceAnswer = ans.type === 'voice' && typeof ans.answer === 'string' && ans.answer.startsWith('https://');
      return {
        questionId: ans.questionId,
        answer: ans.answer,
        reason: ans.reason || undefined,
        hasVoiceFile: isVoiceAnswer,
        voiceUrl: isVoiceAnswer ? ans.answer : undefined,
        type: ans.type
      };
    });
    const newResponse = new Response({
      surveyId,
      answers,
      name,
      email
    });
    await newResponse.save();
    res.status(201).json({ message: 'Response submitted successfully', response: newResponse });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit response', details: error.message });
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
  upload,
  uploadToS3,
};