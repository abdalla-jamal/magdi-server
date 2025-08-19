const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AWS_BUCKET_NAME;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function getS3PublicUrl(key) {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

module.exports = {
  s3,
  PutObjectCommand,
  getS3PublicUrl,
  BUCKET,
};
