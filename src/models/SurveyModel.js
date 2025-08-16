const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },  
  // type: نوع السؤال (text, mcq, checkbox, rating, radio, voice)
  type: {
    type: String,
    enum: ["text", "mcq", "checkbox", "rating", "radio", "voice"],
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  Option: [String],
  options: [String],
  requireReason: {
    type: Boolean,
    default: false,
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
      type: String,
      enum: ["staff", "other"],
      required: true,
    },
  },
  { timestamps: true }
);

const Survey = mongoose.model("Survey", surveySchema);

module.exports = Survey;
