const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary storage for audio files
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'survey_audio',
    resource_type: 'video', // Cloudinary requires audio to be uploaded as "video"
    allowed_formats: ['mp3', 'wav', 'webm', 'ogg'],
    format: 'webm',
    transformation: [{ quality: "auto" }],
    public_id: (req, file) => {
      const timestamp = req.body.timestamp || Date.now();
      const questionId = req.body.questionId || 'unknown';
      return `voice_${timestamp}_${questionId}`;
    }
  }
});

// Configure multer with Cloudinary storage
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

module.exports = {
  cloudinary,
  upload
};
