const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AWS_BUCKET_NAME;
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!REGION || !BUCKET || !ACCESS_KEY || !SECRET_KEY) {
  console.warn('WARNING: Missing AWS S3 credentials or config in environment variables. S3 upload will fail.');
}

console.log('S3 Configuration Status:', {
  REGION: REGION ? '✓' : '✗',
  BUCKET: BUCKET ? '✓' : '✗',
  ACCESS_KEY: ACCESS_KEY ? '✓' : '✗',
  SECRET_KEY: SECRET_KEY ? '✓' : '✗'
});

let s3;
try {
  s3 = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET_KEY,
    },
  });
  console.log('S3 client initialized successfully');
} catch (error) {
  console.error('Failed to initialize S3 client:', error.message);
  s3 = {
    send: () => {
      throw new Error('S3 client not properly initialized. Check AWS credentials and environment variables.');
    }
  };
}

function getS3PublicUrl(key) {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

module.exports = {
  s3,
  PutObjectCommand,
  getS3PublicUrl,
  BUCKET,
};
