const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },  
  // type: نوع السؤال (text, mcq, checkbox, rating, radio, voice)
  type: {
    type: String,
    enum: ["text", "mcq", "checkbox", "rating", "radio", "voice", "text+voice"],
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  Option: [String],
  options: [String],
  // Legacy field for backward compatibility
  requireReason: {
    type: Boolean,
    default: false,
  },
  // New field for choice-level reason requirements
  choiceReasonSettings: {
    type: Map,
    of: Boolean,
    default: new Map(),
  },
});

const surveySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    questions: [questionSchema],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
  },
  { timestamps: true }
);

const Survey = mongoose.model("Survey", surveySchema);

module.exports = Survey;
