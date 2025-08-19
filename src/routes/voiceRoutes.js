const express = require('express');
const Voice = require('../models/Voice');

const router = express.Router();

/**
 * @route   POST /api/voices/upload
 * @desc    Upload a voice recording to Cloudinary and save URL to MongoDB
 * @access  Public
 */
router.post('/upload', async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    // Get the Cloudinary URL from the uploaded file
    const voiceUrl = req.file.path;
    
    // Get optional userId if provided
    const userId = req.body.userId || null;

    // Create a new voice record in the database
    const newVoice = new Voice({
      url: voiceUrl,
      userId: userId
    });

    // Save to MongoDB
    const savedVoice = await newVoice.save();

    // Return success response with voice data
    res.status(201).json({
      success: true,
      data: {
        id: savedVoice._id,
        url: savedVoice.url,
        userId: savedVoice.userId,
        createdAt: savedVoice.createdAt
      }
    });
  } catch (error) {
    console.error('Error uploading voice:', error);
    res.status(500).json({ 
      error: 'Failed to upload voice recording',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/voices
 * @desc    Get all voice recordings
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const voices = await Voice.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: voices.length,
      data: voices
    });
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({ 
      error: 'Failed to fetch voice recordings',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/voices/:id
 * @desc    Get a single voice recording by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const voice = await Voice.findById(req.params.id);
    
    if (!voice) {
      return res.status(404).json({ error: 'Voice recording not found' });
    }
    
    res.status(200).json({
      success: true,
      data: voice
    });
  } catch (error) {
    console.error('Error fetching voice:', error);
    res.status(500).json({ 
      error: 'Failed to fetch voice recording',
      details: error.message
    });
  }
});

module.exports = router;
