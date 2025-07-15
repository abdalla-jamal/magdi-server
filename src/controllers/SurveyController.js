const Survey = require("../models/SurveyModel");

const createSurvey = async (req, res) => {
  try {
    // Validate status before creating survey
    const validStatuses = ["open", "closed"];
    if (req.body.status && !validStatuses.includes(req.body.status)) {
      return res
        .status(400)
        .json({ error: 'Invalid status value. Must be "open" or "closed".' });
    }

    const survey = await Survey.create(req.body);
    
    // Generate survey link
    const surveyLink = `${req.protocol}://${req.get('host')}/api/surveys/${survey._id}/respond`;
    
    res.status(201).json({
      survey,
      surveyLink,
      message: 'Survey created successfully! Share this link with respondents.'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAllSurveys = async (req, res) => {
  try {
    const survey = await Survey.find().sort({ createdAt: -1 });
    res.status(200).json(survey);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getSurveyById = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    res.status(200).json(survey);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get survey for response (public endpoint)
const getSurveyForResponse = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    if (survey.status !== 'open') {
      return res.status(400).json({ error: 'This survey is not accepting responses' });
    }

    // Return only necessary data for response
    const surveyForResponse = {
      _id: survey._id,
      title: survey.title,
      description: survey.description,
      questions: survey.questions.map(q => ({
        _id: q._id,
        type: q.type,
        questionText: q.questionText,
        options: q.options || q.Option || []
      }))
    };

    res.status(200).json(surveyForResponse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get survey link
const getSurveyLink = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    
    const surveyLink = `${req.protocol}://${req.get('host')}/api/surveys/${survey._id}/respond`;
    
    res.status(200).json({
      surveyId: survey._id,
      surveyTitle: survey.title,
      surveyLink,
      status: survey.status
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateSurvay = async (req, res) => {
  try {
    const survey = await Survey.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    res.status(200).json(survey);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteSurvey = async (req, res) => {
  try {
    const survey = await Survey.findByIdAndDelete(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    res.status(200).json(survey);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createSurvey,
  getAllSurveys,
  getSurveyById,
  getSurveyForResponse,
  getSurveyLink,
  updateSurvay,
  deleteSurvey
};
