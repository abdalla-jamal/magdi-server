const express = require("express");
const {
  submitResponse,
  getResponsesBySurvey,
  uploadVoiceResponse,
  upload,
} = require("../controllers/responseController.js");

const router = express.Router();

// Main response submission endpoint (handles multipart form data with files)
router.post("/create", upload.any(), submitResponse);

// Dedicated endpoint for voice uploads
router.post("/uploadVoice", upload.single('voiceFile'), uploadVoiceResponse);

// Get responses for a specific survey
router.get("/:surveyId", getResponsesBySurvey);

module.exports = router;
