const express = require("express");
const {
  submitResponse,
  getResponsesBySurvey,
  uploadVoiceResponse,
  upload,
  uploadToS3,
} = require("../controllers/responseController.js");

const router = express.Router();

// Main response submission endpoint (handles multipart form data with files)
router.post("/create", upload.any(), submitResponse);

// Dedicated endpoint for voice uploads
router.post("/uploadVoice", (req, res, next) => {
  console.log("Request received at /uploadVoice endpoint");
  console.log("Content-Type:", req.headers['content-type']);
  console.log("Request body:", req.body);
  next();
}, upload.single('voiceFile'), uploadVoiceResponse);

// Add S3 upload endpoint
router.post("/upload", upload.single('file'), uploadToS3);

// Get responses for a specific survey
router.get("/:surveyId", getResponsesBySurvey);

module.exports = router;
