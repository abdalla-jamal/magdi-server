const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get environment variables with fallbacks and logging
const REGION = process.env.AWS_REGION || 'eu-north-1';
const BUCKET = process.env.AWS_BUCKET_NAME || 'magdi-yacoub-bucket';
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;

// Log environment variable status (without exposing secrets)
console.log('S3 Configuration Status:', {
  REGION: REGION ? '✓' : '✗',
  BUCKET: BUCKET ? '✓' : '✗',
  ACCESS_KEY: ACCESS_KEY ? '✓' : '✗',
  SECRET_KEY: SECRET_KEY ? '✓' : '✗'
});

// Create S3 client with proper error handling
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
  // Create a dummy client that will throw clear errors when used
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
