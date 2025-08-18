const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/upload-audio
router.post("/uploadVoice", upload.single("voiceAnswer"), async (req, res) => {
  console.log("POST /api/responses/uploadVoice called");
  try {
    console.log("Received file:", req.file);
    if (!req.file) return res.status(400).json({ error: "No audio file uploaded" });

    // Upload to Cloudinary
    console.log("Uploading to Cloudinary...");
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video",
      folder: "audio_recordings",
      format: "webm"
    });
    console.log("Cloudinary upload result:", result);

    // Delete temp file
    fs.unlinkSync(req.file.path);

    // Return Cloudinary URL
    res.json({ secure_url: result.secure_url });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
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
