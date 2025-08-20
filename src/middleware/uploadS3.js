const path = require('path');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');

// Ensure env is loaded (supports running from different cwd)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_BUCKET_NAME;

// Multer middleware configured to upload directly to S3
const uploadS3 = multer({
  storage: multerS3({
    s3,
    bucket: BUCKET,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata(_req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key(req, file, cb) {
      const surveyId = req.body.surveyId || 'default';
      const questionId = req.body.questionId || 'unknown';
      const timestamp = Date.now();
      const original = path.basename(file.originalname || 'audio.webm');
      const key = `audio/${surveyId}/${questionId}/${timestamp}-${original}`;
      cb(null, key);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

module.exports = uploadS3;


