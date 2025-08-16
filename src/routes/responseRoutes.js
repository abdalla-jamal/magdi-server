const express = require("express");
const {
  submitResponse,
  getResponsesBySurvey,
  upload,
} = require("../controllers/responseController.js");

const router = express.Router();

router.post("/create", upload.any(), submitResponse);
router.get("/:surveyId", getResponsesBySurvey);

module.exports= router;
