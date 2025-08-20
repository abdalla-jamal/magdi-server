/*
 Configure S3 bucket CORS and public-read policy for audio files.
 Usage:
   node scripts/configureS3.js --bucket <BUCKET_NAME> --origins "https://example.com,http://localhost:5173"
*/

const { S3Client, PutBucketCorsCommand, PutBucketPolicyCommand, PutPublicAccessBlockCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--bucket') out.bucket = args[++i];
    else if (a === '--origins') out.origins = args[++i];
  }
  return out;
}

async function main() {
  const { bucket: bucketFromArg, origins: originsArg } = parseArgs();
  const BUCKET = bucketFromArg || process.env.AWS_BUCKET_NAME;
  if (!BUCKET) {
    console.error('Missing bucket. Pass --bucket or set AWS_BUCKET_NAME in .env');
    process.exit(1);
  }

  const REGION = process.env.AWS_REGION;
  const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
  const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
  if (!REGION || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    console.error('Missing AWS credentials/region in .env');
    process.exit(1);
  }

  const allowedOrigins = (originsArg ? originsArg.split(',') : [
  
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ]).map(s => s.trim()).filter(Boolean);

  const s3 = new S3Client({
    region: REGION,
    credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
  });

  console.log('Configuring S3 bucket:', BUCKET);
  console.log('Allowed origins:', allowedOrigins);

  // 1) Disable public access block (so bucket policy can grant public read)
  try {
    await s3.send(new PutPublicAccessBlockCommand({
      Bucket: BUCKET,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        IgnorePublicAcls: false,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      },
    }));
    console.log('Public access block relaxed.');
  } catch (e) {
    console.warn('Failed to update PublicAccessBlock (continuing):', e.message);
  }

  // 2) Set CORS
  const corsRules = [{
    AllowedOrigins: allowedOrigins,
    AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
    AllowedHeaders: ['*'],
    ExposeHeaders: ['Content-Type', 'Content-Length'],
    MaxAgeSeconds: 3000,
  }];

  try {
    await s3.send(new PutBucketCorsCommand({
      Bucket: BUCKET,
      CORSConfiguration: { CORSRules: corsRules },
    }));
    console.log('CORS configured.');
  } catch (e) {
    console.error('Failed to set CORS:', e.message);
    process.exit(1);
  }

  // 3) Attach bucket policy for public read on audio paths
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadForAudio',
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: [
          `arn:aws:s3:::${BUCKET}/audio/*`,
          `arn:aws:s3:::${BUCKET}/records/*`,
        ],
      },
    ],
  };

  try {
    await s3.send(new PutBucketPolicyCommand({
      Bucket: BUCKET,
      Policy: JSON.stringify(policy),
    }));
    console.log('Bucket policy applied for public read on audio and records.');
  } catch (e) {
    console.error('Failed to set bucket policy:', e.message);
    process.exit(1);
  }

  console.log('Done. Upload a new audio file and try playing it inline.');
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});


