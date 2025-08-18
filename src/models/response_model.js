const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  answer: {
    type: mongoose.Schema.Types.Mixed, //  يقبل String أو Array أو Number
    required: true
  },
  reason: {
    type: String,
    required: false
  },
  hasVoiceFile: {
    type: Boolean,
    default: false
  },
  voiceUrl: {
    type: String,
    required: false
  }
}, { _id: false });

const responseSchema = new mongoose.Schema({
  surveyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Survey',
    required: true
  },
  answers: {
    type: [answerSchema],
    required: true,
    validate: [arr => arr.length > 0, 'Answers array must not be empty']
  },
  name: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Response = mongoose.model('Response', responseSchema);

module.exports = Response;
