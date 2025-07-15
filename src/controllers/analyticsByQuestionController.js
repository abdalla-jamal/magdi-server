
const Survey = require('../models/SurveyModel');
const Response = require('../models/response_model');
const getResponsesByQuestion = async (req, res) => {
  try {
    const { surveyId } = req.params;

    const survey = await Survey.findById(surveyId);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });

    const responses = await Response.find({ surveyId: surveyId }).sort({ createdAt: 1 });
    if (!responses.length) return res.status(404).json({ error: 'No responses found' });

    const result = survey.questions.map((question) => ({
      questionId: question._id,
      questionText: question.questionText,
      questionType: question.type,
      responses: []
    }));

    responses.forEach((response, index) => {
      response.answers.forEach(ans => {
        const qIndex = result.findIndex(q => q.questionId.toString() === ans.questionId.toString());
        if (qIndex !== -1) {
          const value = Array.isArray(ans.answer) ? ans.answer.join(', ') : ans.answer;
          result[qIndex].responses.push({
            respondentNumber: index + 1,
            submittedAt: response.createdAt,
            answer: value
          });
        }
      });
    });

    res.status(200).json({
      surveyTitle: survey.title,
      totalQuestions: result.length,
      questions: result
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getResponsesByQuestion };