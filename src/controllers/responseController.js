const Response = require('../models/response_model.js');
const Survey = require('../models/SurveyModel');
const mongoose = require('mongoose');

const submitResponse = async (req, res) => {
  try {
    const { surveyId, answers, name, email } = req.body;

    if (!surveyId || !answers || !Array.isArray(answers) || answers.length === 0 || !name || !email) {
      return res.status(400).json({ error: 'surveyId, answers, name, and email are required' });
    }

    // Check if survey exists and is open
    const survey = await Survey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    if (survey.status !== 'open') {
      return res.status(400).json({ error: 'Survey is not open for responses' });
    }

    const newResponse = new Response({
      surveyId,
      answers,
      name,
      email
    });

    await newResponse.save();
    res.status(201).json({ message: 'Response submitted successfully', response: newResponse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit response' });
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
  submitResponse
};