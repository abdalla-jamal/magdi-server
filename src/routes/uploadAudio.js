const express = require('express');
const { getS3PublicUrl } = require('../utils/s3');
const Voice = require('../models/Voice');
const upload = require('../middleware/uploadS3');
const router = express.Router();



// Route to handle audio upload
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        console.log('Upload request received');
        console.log('Files:', req.file ? 'File present' : 'No file');
        console.log('Body:', req.body);

        if (!req.body?.questionId) {
            return res.status(400).json({ error: 'Missing questionId in form-data' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }

        const { key, location } = req.file; // provided by multer-s3
        const surveyId = req.body.surveyId || 'default';
        const questionId = req.body.questionId;

        // Prefer location from multer-s3; fallback to constructing URL
        const fileUrl = location || getS3PublicUrl(key);

        // Save voice record to database
        const newVoice = new Voice({
            url: fileUrl,
            surveyId: surveyId,
            questionId: questionId
        });

        const savedVoice = await newVoice.save();

        res.status(201).json({
            success: true,
            data: {
                id: savedVoice._id,
                url: savedVoice.url,
                surveyId: savedVoice.surveyId,
                questionId: savedVoice.questionId,
                createdAt: savedVoice.createdAt
            }
        });

    } catch (error) {
        console.error('Error uploading audio:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        
        // Check specific error types
        if (error.$metadata) {
            console.error('AWS Error Metadata:', error.$metadata);
        }
        
        res.status(500).json({
            error: 'Failed to upload audio recording',
            details: error.message,
            code: error.code || 'UNKNOWN_ERROR'
        });
    }
});

// Route to get all voice recordings for a survey
router.get('/survey/:surveyId', async (req, res) => {
    try {
        const voices = await Voice.find({ surveyId: req.params.surveyId });
        res.json(voices);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch voice recordings' });
    }
});

module.exports = router;
