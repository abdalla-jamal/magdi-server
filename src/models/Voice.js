const mongoose = require('mongoose');

/**
 * Voice model schema
 * Stores voice recording metadata including file URL
 */
const voiceSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    trim: true
  },
  surveyId: {
    type: String,
    required: true
  },
  questionId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Voice = mongoose.model('Voice', voiceSchema);

module.exports = Voice;
