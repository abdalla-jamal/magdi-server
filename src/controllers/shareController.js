const { sendSurveyEmail } = require('../services/emailService');

/**
 * POST /api/share/email
 * Body: { email, surveyLink }
 */
async function shareViaEmail(req, res) {
  try {
    const { email, surveyLink } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'A valid email is required' });
    }
    if (!surveyLink || typeof surveyLink !== 'string') {
      return res.status(400).json({ message: 'A valid surveyLink is required' });
    }

    await sendSurveyEmail({ toEmail: email, surveyLink });

    return res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending survey email:', error);
    return res.status(500).json({ message: 'Failed to send email' });
  }
}

module.exports = { shareViaEmail };


