const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  otp: { type: String, required: true },                // bcrypt hash of the 6-digit code
  purpose: { type: String, enum: ['register', 'reset'], required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true }
});
// MongoDB removes expired OTPs automatically (the code also checks expiry itself).
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
