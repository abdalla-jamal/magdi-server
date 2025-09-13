const { Resend } = require('resend');

/**
 * Send a survey share email via Resend.
 * Env required: RESEND_API_KEY, FROM_EMAIL (must be a verified domain/sender)
 */
async function sendSurveyEmail({ toEmail, surveyLink }) {
  if (!toEmail || !surveyLink) {
    throw new Error('Email and surveyLink are required');
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const resend = new Resend(apiKey);

  const fromAddress = process.env.FROM_EMAIL || 'onboarding@resend.dev'; // this is the email address that will be used to send the email
  const subject = 'You have been invited to fill out a survey';
  const text = `You have been invited to fill out a survey. Click the link: ${surveyLink}`;
  const html = `<p>You have been invited to fill out a survey.</p><p>Click the link: <a href="${surveyLink}" target="_blank" rel="noopener noreferrer">${surveyLink}</a></p>`;

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: toEmail,
    subject,
    text,
    html,
  });

  if (error) {
    throw new Error(error.message || 'Failed to send email via Resend');
  }
}

module.exports = { sendSurveyEmail };


