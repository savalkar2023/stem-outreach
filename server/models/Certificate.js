const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  certificateId: { type: String, required: true, unique: true },
  score: { type: Number, required: true },
  issuedDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Certificate', certificateSchema);
