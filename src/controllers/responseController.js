const Response = require('../models/response_model.js');
const Survey = require('../models/SurveyModel');

const submitResponse = async (req, res) => {
  try {
    const { surveyId, answers } = req.body;

    if (!surveyId || !answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'surveyId and answers are required' });
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
    const responses = await Response.find({ surveyId });
    res.status(200).json(responses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
};

module.exports = {
  getResponsesBySurvey,
  submitResponse
};