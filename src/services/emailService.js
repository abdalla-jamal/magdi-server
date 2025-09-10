const nodemailer = require('nodemailer');

/**
 * Create and cache a Nodemailer transporter using Gmail SMTP.
 */
let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const {
    SMTP_HOST = 'smtp.gmail.com',
    SMTP_PORT = 587,
    SMTP_USER,
    SMTP_PASS,
    FROM_EMAIL,
  } = process.env;

  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP credentials are not configured. Set SMTP_USER and SMTP_PASS env vars.');
  }

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return cachedTransporter;
}

/**
 * Send a survey share email.
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.surveyLink - Survey link to include in the email
 */
async function sendSurveyEmail({ toEmail, surveyLink }) {
  if (!toEmail || !surveyLink) {
    throw new Error('Email and surveyLink are required');
  }

  const transporter = getTransporter();

  const fromAddress = process.env.FROM_EMAIL || `Survey App <${process.env.SMTP_USER}>`;
  const subject = 'You have been invited to fill out a survey';
  const text = `You have been invited to fill out a survey. Click the link: ${surveyLink}`;
  const html = `<p>You have been invited to fill out a survey.</p><p>Click the link: <a href="${surveyLink}" target="_blank" rel="noopener noreferrer">${surveyLink}</a></p>`;

  await transporter.sendMail({
    from: fromAddress,
    to: toEmail,
    subject,
    text,
    html,
  });
}

module.exports = { sendSurveyEmail };


