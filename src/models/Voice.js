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
  userId: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Voice = mongoose.model('Voice', voiceSchema);

module.exports = Voice;
