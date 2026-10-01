const mongoose = require('mongoose');
const { CATEGORIES, DIFFICULTIES } = require('../config/constants');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  options: { type: [String], validate: [v => v.length >= 2, 'A question needs at least 2 options.'] },
  answerIndex: { type: Number, required: true, min: 0 },   // position of the correct option
  marks: { type: Number, default: 1, min: 1 }
}, { _id: false });

const activitySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: { type: String, required: true, enum: CATEGORIES },
  description: { type: String, required: true, trim: true },
  objective: { type: String, default: '', trim: true },
  difficulty: { type: String, enum: DIFFICULTIES, default: 'Easy' },
  duration: { type: Number, default: 15, min: 1 },          // minutes
  instructions: { type: String, default: '', trim: true },
  questions: { type: [questionSchema], validate: [v => v.length >= 1, 'Add at least one question.'] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Activity', activitySchema);
