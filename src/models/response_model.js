const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  answer: {
    type: mongoose.Schema.Types.Mixed, //  يقبل String أو Array أو Number
    default: null
  },
  textAnswer: {
    type: String,
    required: false // For text+voice questions
  },
  voiceAnswerUrl: {
    type: String,
    required: false // For text+voice questions
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
  },
  type: {
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
    validate: {
      validator: function(arr) {
        return arr && arr.length > 0;
      },
      message: 'Answers array must not be empty'
    }
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
