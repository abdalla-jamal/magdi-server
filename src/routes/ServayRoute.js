const express = require("express");
const router = express.Router();
const {
  createSurvey,
  getAllSurveys,
  getSurveyById,
  getSurveyForResponse,
  getSurveyLink,
  updateSurvay,
  deleteSurvey,
} = require("../controllers/SurveyController.js");

// Add checkSurveyHasResponses function
const checkSurveyHasResponses = async (req, res) => {
  try {
    const { surveyId } = req.params;
    
    // Validate surveyId
    if (!surveyId) {
      return res.status(400).json({ error: 'Survey ID is required' });
    }

    // Check if survey exists
    const Survey = require("../models/SurveyModel");
    const Response = require("../models/response_model.js");
    
    const survey = await Survey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    // Count responses for this survey
    const responseCount = await Response.countDocuments({ surveyId });
    
    res.status(200).json({
      surveyId,
      surveyTitle: survey.title,
      hasResponses: responseCount > 0,
      responseCount,
      message: responseCount > 0 
        ? `Survey has ${responseCount} response(s)` 
        : 'Survey has no responses yet'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to check survey responses' });
  }
};

router.post("/create", createSurvey);
router.get("/all", getAllSurveys);
router.get("/:id", getSurveyById);
router.get("/:surveyId/has-responses", checkSurveyHasResponses);
router.get("/:id/respond", getSurveyForResponse);
router.get("/:id/link", getSurveyLink); 
router.patch("/:id", updateSurvay);
router.delete("/:id" ,deleteSurvey);

module.exports = router;
