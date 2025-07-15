const express = require('express');
const router = express.Router();

const {
  getAnalytics,
  exportAnalytics,
  exportAnswersByQuestion,
  getQuestionOptions,
  getAllSurveysAnalytics,
  exportAllSurveysAnalytics
} = require('../controllers/analyticsController');

const {
  getResponsesByPerson
} = require('../controllers/analyticsByPersonController');

const {
  getResponsesByQuestion
} = require('../controllers/analyticsByQuestionController');

// ==========================
// ANALYTICS ROUTES
// ==========================

// Get analytics for all surveys at once
// Example: GET /analytics/all
router.get('/all', getAllSurveysAnalytics);

// Export all surveys analytics to CSV
// Example: GET /analytics/export-all/csv
router.get('/export-all/csv', exportAllSurveysAnalytics);

// Export analytics in summary format (CSV or JSON)
// Example: GET /analytics/export/12345/csv
// Example: GET /analytics/export/12345/json
router.get('/export/:surveyId/:format', exportAnalytics);

// Export answers by question (CSV or JSON)
// Example: GET /analytics/export-answers-by-question/12345/csv
// Example: GET /analytics/export-answers-by-question/12345/json
router.get('/export-answers-by-question/:surveyId/:format', exportAnswersByQuestion);

// Get responses by question for a specific survey
// Example: GET /analytics/12345/responses-by-question
router.get('/:surveyId/responses-by-question', getResponsesByQuestion);

// Get responses by person for a specific survey
// Example: GET /analytics/12345/responses-by-person
router.get('/:surveyId/responses-by-person', getResponsesByPerson);

// Get options for a specific question in a survey
// Example: GET /analytics/12345/question/67890/options
router.get('/:surveyId/question/:questionId/options', getQuestionOptions);

// Get general analytics data for a specific survey
// Must be the last one to avoid route conflicts
// Example: GET /analytics/12345
router.get('/:surveyId', getAnalytics);

module.exports = router;
