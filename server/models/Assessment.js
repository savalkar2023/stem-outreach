const mongoose = require('mongoose');

// One Pre-Assessment and one Post-Assessment per student.
const assessmentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['pre', 'post'], required: true },
  questions: [{
    _id: false,
    text: String,
    selected: Number,
    correct: Number,
    isCorrect: Boolean
  }],
  score: { type: Number, required: true },              // number of correct answers
  totalQuestions: { type: Number, required: true },
  percentage: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now }
});
assessmentSchema.index({ studentId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Assessment', assessmentSchema);
