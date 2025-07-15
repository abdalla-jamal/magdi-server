const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },  
  type: {
    type: String,
    enum: ["text", "mcq", "checkbox", "rating", "radio"],
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  Option: [String],
  options: [String],
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
  },
  { timestamps: true }
);

const Survey = mongoose.model("Survey", surveySchema);

module.exports = Survey;
