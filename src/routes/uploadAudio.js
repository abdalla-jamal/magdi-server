const express = require('express');
const multer = require('multer');
const { s3, PutObjectCommand, getS3PublicUrl } = require('../utils/s3');
const Voice = require('../models/Voice');
const router = express.Router();

// Configure multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Route to handle audio upload
router.post('/upload', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }

        const file = req.file;
        const surveyId = req.body.surveyId;
        const questionId = req.body.questionId;

        // Generate a unique filename
        const timestamp = Date.now();
        const filename = `audio/${surveyId}/${questionId}/${timestamp}-${file.originalname}`;

        // Upload to S3
        const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: filename,
            Body: file.buffer,
            ContentType: file.mimetype
        };

        await s3.send(new PutObjectCommand(uploadParams));

        // Get the public URL
        const fileUrl = getS3PublicUrl(filename);

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
        res.status(500).json({
            error: 'Failed to upload audio recording',
            details: error.message
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
