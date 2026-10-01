// Registration, OTP verification, login, forgot/reset password.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const asyncHandler = require('../utils/asyncHandler');
const { generateOtp, sendOtp } = require('../utils/otp');
const { isEmail, isMobile, passwordError, text } = require('../utils/validate');
const { OTP_MINUTES } = require('../config/constants');

const bad = (res, message, status = 400) => res.status(status).json({ message });

const safeUser = u => ({
  id: u._id, name: u.name, email: u.email, role: u.role,
  school: u.school, class: u.class, city: u.city, profileImage: u.profileImage
});

// Create a new OTP (old ones for the same email/purpose are removed) and send it.
async function issueOtp(email, purpose) {
  const otp = generateOtp();
  await Otp.deleteMany({ email, purpose });
  await Otp.create({
    email, purpose,
    otp: await bcrypt.hash(otp, 8),
    expiresAt: new Date(Date.now() + OTP_MINUTES * 60 * 1000)
  });
  const info = await sendOtp(email, otp, purpose);
  // In development the OTP can also be shown on the website (DEV_SHOW_OTP=true).
  return process.env.DEV_SHOW_OTP === 'true' && !info.emailed ? otp : undefined;
}

// Returns an error message, or null if the OTP is correct.
async function checkOtp(email, otp, purpose) {
  const rec = await Otp.findOne({ email, purpose });
  if (!rec) return 'No OTP found. Please request a new OTP.';
  if (rec.expiresAt < new Date()) { await rec.deleteOne(); return 'OTP has expired. Please request a new OTP.'; }
  if (rec.attempts >= 5) { await rec.deleteOne(); return 'Too many wrong attempts. Please request a new OTP.'; }
  if (!(await bcrypt.compare(String(otp || ''), rec.otp))) {
    rec.attempts += 1;
    await rec.save();
    return 'Wrong OTP. Please try again.';
  }
  await rec.deleteOne();
  return null;
}

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const name = text(b.name), email = text(b.email).toLowerCase(), mobile = text(b.mobile);
  const school = text(b.school), grade = text(b.class), city = text(b.city);
  const password = b.password || '', profileImage = b.profileImage || '';

  if (!name || !email || !mobile || !password || !b.confirmPassword || !school || !grade || !city)
    return bad(res, 'Please fill in all the fields.');
  if (!isEmail(email)) return bad(res, 'Please enter a valid email address.');
  if (!isMobile(mobile)) return bad(res, 'Mobile number must have 10 to 13 digits.');
  const pe = passwordError(password);
  if (pe) return bad(res, pe);
  if (password !== b.confirmPassword) return bad(res, 'Passwords do not match.');
  if (profileImage && (!String(profileImage).startsWith('data:image/') || profileImage.length > 600000))
    return bad(res, 'Profile photo must be a small image.');

  const existing = await User.findOne({ email });
  if (existing && existing.isVerified) return bad(res, 'An account with this email already exists.', 409);

  const hash = await bcrypt.hash(password, 10);
  const fields = { name, email, mobile, school, class: grade, city, profileImage, password: hash, role: 'student', isVerified: false };
  if (existing) await User.updateOne({ _id: existing._id }, fields);   // unverified account: update and resend OTP
  else await User.create(fields);

  const devOtp = await issueOtp(email, 'register');
  res.status(201).json({ message: 'OTP sent. Please verify your account.', email, devOtp });
});

// POST /api/auth/verify-otp   (purpose: register | reset)
exports.verifyOtp = asyncHandler(async (req, res) => {
  const email = text(req.body.email).toLowerCase();
  const otp = text(req.body.otp);
  const purpose = req.body.purpose === 'reset' ? 'reset' : 'register';
  if (!isEmail(email)) return bad(res, 'Please enter a valid email address.');
  if (!/^\d{6}$/.test(otp)) return bad(res, 'OTP must be 6 digits.');

  const err = await checkOtp(email, otp, purpose);
  if (err) return bad(res, err);

  const user = await User.findOne({ email });
  if (!user) return bad(res, 'Account not found.', 404);

  if (purpose === 'register') {
    user.isVerified = true;
    await user.save();
    return res.json({ message: 'Account verified! You can login now.' });
  }
  const resetToken = jwt.sign({ id: user._id, type: 'reset' }, process.env.JWT_SECRET, { expiresIn: '10m' });
  res.json({ message: 'OTP verified. Set your new password.', resetToken });
});

// POST /api/auth/resend-otp
exports.resendOtp = asyncHandler(async (req, res) => {
  const email = text(req.body.email).toLowerCase();
  const purpose = req.body.purpose === 'reset' ? 'reset' : 'register';
  const user = await User.findOne({ email });
  if (!user) return bad(res, 'No account found with this email.', 404);
  if (purpose === 'register' && user.isVerified) return bad(res, 'This account is already verified. Please login.');
  const devOtp = await issueOtp(email, purpose);
  res.json({ message: 'A new OTP has been sent.', devOtp });
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const email = text(req.body.email).toLowerCase();
  const password = req.body.password || '';
  if (!email || !password) return bad(res, 'Please enter email and password.');

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) return bad(res, 'Invalid email or password.', 401);
  if (!user.isVerified)
    return res.status(403).json({ message: 'Your account is not verified yet. Please verify the OTP.', needsVerification: true, email });

  const token = jwt.sign({ id: user._id, role: user.role, type: 'access' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ message: 'Login successful.', token, user: safeUser(user) });
});

// POST /api/auth/forgot-password
exports.forgotPassword = asyncHandler(async (req, res) => {
  const email = text(req.body.email).toLowerCase();
  if (!isEmail(email)) return bad(res, 'Please enter a valid email address.');
  const user = await User.findOne({ email, isVerified: true });
  if (!user) return bad(res, 'No account found with this email.', 404);
  const devOtp = await issueOtp(email, 'reset');
  res.json({ message: 'OTP sent to your email.', email, devOtp });
});

// POST /api/auth/reset-password
exports.resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, password, confirmPassword } = req.body || {};
  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    if (decoded.type !== 'reset') throw new Error('bad');
  } catch (e) {
    return bad(res, 'Reset session expired. Please start again from Forgot Password.', 401);
  }
  const pe = passwordError(password);
  if (pe) return bad(res, pe);
  if (password !== confirmPassword) return bad(res, 'Passwords do not match.');
  await User.updateOne({ _id: decoded.id }, { password: await bcrypt.hash(password, 10) });
  res.json({ message: 'Password updated. Please login with your new password.' });
});
