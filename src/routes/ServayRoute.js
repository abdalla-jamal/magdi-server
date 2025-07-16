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
const superAdminProtect = require('../middleware/superAdminMiddleware.js')

router.post("/create", createSurvey);
router.get("/all", getAllSurveys);
router.get("/:id", getSurveyById);
router.get("/:id/respond", getSurveyForResponse);
router.get("/:id/link", getSurveyLink); 
router.patch("/:id", updateSurvay);
router.delete("/:id",superAdminProtect ,deleteSurvey);

module.exports = router;
