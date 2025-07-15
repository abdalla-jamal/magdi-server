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

router.post("/create", createSurvey);
router.get("/all", getAllSurveys);
router.get("/:id", getSurveyById);
router.get("/:id/respond", getSurveyForResponse); //added new Public endpoint for survey response
router.get("/:id/link", getSurveyLink); //added new Get survey link
router.patch("/:id", updateSurvay);
router.delete("/:id", deleteSurvey);

module.exports = router;
