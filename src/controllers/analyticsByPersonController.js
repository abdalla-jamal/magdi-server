
const Survey = require('../models/SurveyModel');
const Response = require('../models/response_model');

const getResponsesByPerson = async (req, res) => {
  try {
    const { surveyId } = req.params;

    const survey = await Survey.findById(surveyId);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });

    const responses = await Response.find({ surveyId: surveyId }).sort({ createdAt: 1 });
    if (!responses.length) return res.status(404).json({ error: 'No responses found for this survey' });

    const result = responses.map(response => {
      const formatted = {
        responseId: response._id,
        submittedAt: response.createdAt
      };

      response.answers.forEach(ans => {
        const question = survey.questions.find(q => q._id.toString() === ans.questionId.toString());
        const key = question ? question.questionText : `[Unknown Question: ${ans.questionId}]`;
        const value = Array.isArray(ans.answer) ? ans.answer.join(', ') : ans.answer;
        formatted[key] = value;
      });

      return formatted;
    });

    res.status(200).json({
      surveyTitle: survey.title,
      totalResponses: result.length,
      responses: result
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getResponsesByPerson };