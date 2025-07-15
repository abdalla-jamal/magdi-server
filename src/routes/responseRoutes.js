const express = require("express");
const {
  submitResponse,
  getResponsesBySurvey,
} = require("../controllers/responseController.js");

const router = express.Router();

router.post("/create", submitResponse);
router.get("/:surveyId", getResponsesBySurvey);

module.exports= router;
