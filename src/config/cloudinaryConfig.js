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
// Note: resource_type is set to "video" for audio files as per Cloudinary requirements
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'voices',
    resource_type: 'video', // Important: Cloudinary requires audio to be uploaded as "video"
    allowed_formats: ['mp3', 'wav', 'webm', 'ogg'],
    public_id: (req, file) => `voice_${Date.now()}_${Math.round(Math.random() * 1E9)}`
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
