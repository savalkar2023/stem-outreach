const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, trim: true, default: '' },
  password: { type: String, required: true },            // bcrypt hash, never plain text
  school: { type: String, trim: true, default: '' },
  class: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '' },
  profileImage: { type: String, default: '' },           // small JPEG stored as a data URL
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
