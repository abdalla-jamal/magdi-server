const express = require("express");
const router = express.Router();
const {
  createSurvey,
  getAllSurveys,
  getSurveyById,
  checkSurveyHasResponses,
  getSurveyForResponse,
  getSurveyLink,
  updateSurvay,
  deleteSurvey,
} = require("../controllers/SurveyController.js");

router.post("/create", createSurvey);
router.get("/all", getAllSurveys);
router.get("/:id", getSurveyById);
router.get("/:surveyId/has-responses", checkSurveyHasResponses);
router.get("/:id/respond", getSurveyForResponse);
router.get("/:id/link", getSurveyLink); 
router.patch("/:id", updateSurvay);
router.delete("/:id" ,deleteSurvey);

module.exports = router;
