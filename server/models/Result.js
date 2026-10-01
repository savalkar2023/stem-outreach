const mongoose = require('mongoose');

// One result per student per activity (a retake replaces the old result).
const resultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
  score: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  percentage: { type: Number, required: true },
  completedAt: { type: Date, default: Date.now }
});
resultSchema.index({ studentId: 1, activityId: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);
