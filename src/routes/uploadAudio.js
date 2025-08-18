const express = require("express");
const { upload, cloudinary } = require("../config/cloudinaryConfig");
const fs = require("fs");

const router = express.Router();

// POST /api/responses/uploadVoice
router.post("/uploadVoice", upload.single("voiceAnswer"), async (req, res) => {
  console.log("POST /api/responses/uploadVoice called");
  try {
    console.log("Received file:", req.file);
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    // File is automatically uploaded to Cloudinary by the CloudinaryStorage
    // Just return the URL from the uploaded file
    console.log("File uploaded successfully to Cloudinary");
    
    res.json({ 
      secure_url: req.file.path, // CloudinaryStorage provides the URL in path
      public_id: req.file.filename,
      questionId: req.body.questionId
    });
  } catch (err) {
    console.error("Upload error:", err);
    // Send more detailed error message in development
    const errorMessage = process.env.NODE_ENV === 'development' ? err.message : 'Upload failed';
    res.status(500).json({ error: errorMessage });
  }
});

// Error handler for multer and other errors
router.use((err, req, res, next) => {
  if (err) {
    console.error("Multer or route error:", err);
    res.status(500).json({ error: err.message });
  } else {
    next();
  }
});

module.exports = router;
