// Student features: profile, activities, activity results, progress, certificate.
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Result = require('../models/Result');
const Certificate = require('../models/Certificate');
const asyncHandler = require('../utils/asyncHandler');
const { computeProgress } = require('../utils/progress');
const { isMobile, passwordError, text } = require('../utils/validate');
const { PROGRAM_NAME } = require('../config/constants');

const bad = (res, message, status = 400) => res.status(status).json({ message });

// ---------- Profile ----------
exports.getProfile = asyncHandler(async (req, res) => {
  const p = await computeProgress(req.user._id);
  res.json({
    user: req.user,
    stats: { activitiesCompleted: p.completedActivities, totalScore: p.totalScore, avgScore: p.avgScore, certificates: p.certificates }
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const update = {};
  for (const f of ['name', 'mobile', 'school', 'class', 'city']) {
    if (b[f] !== undefined) {
      update[f] = text(b[f]);
      if (!update[f]) return bad(res, 'Please fill in all the fields.');
    }
  }
  if (update.mobile && !isMobile(update.mobile)) return bad(res, 'Mobile number must have 10 to 13 digits.');
  if (b.profileImage !== undefined) {
    if (b.profileImage && (!String(b.profileImage).startsWith('data:image/') || b.profileImage.length > 600000))
      return bad(res, 'Profile photo must be a small image.');
    update.profileImage = b.profileImage;
  }
  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true }).select('-password');
  res.json({ message: 'Profile updated.', user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};
  const user = await User.findById(req.user._id);
  if (!(await bcrypt.compare(currentPassword || '', user.password))) return bad(res, 'Current password is wrong.');
  const pe = passwordError(newPassword);
  if (pe) return bad(res, pe);
  if (newPassword !== confirmPassword) return bad(res, 'New passwords do not match.');
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ message: 'Password changed successfully.' });
});

// ---------- Activities ----------
const totalMarks = a => a.questions.reduce((s, q) => s + q.marks, 0);

exports.listActivities = asyncHandler(async (req, res) => {
  const filter = req.query.category ? { category: String(req.query.category) } : {};
  const [activities, results] = await Promise.all([
    Activity.find(filter).sort({ createdAt: 1, _id: 1 }).lean(),
    Result.find({ studentId: req.user._id }).lean()
  ]);
  const done = new Map(results.map(r => [String(r.activityId), r]));
  res.json(activities.map(a => ({
    _id: a._id, title: a.title, category: a.category, description: a.description,
    objective: a.objective, difficulty: a.difficulty, duration: a.duration,
    questionCount: a.questions.length, totalMarks: totalMarks(a),
    completed: done.has(String(a._id)),
    percentage: done.has(String(a._id)) ? done.get(String(a._id)).percentage : null
  })));
});

// Questions are sent WITHOUT the correct answers.
exports.getActivity = asyncHandler(async (req, res) => {
  const a = await Activity.findById(req.params.id).lean();
  if (!a) return bad(res, 'Activity not found.', 404);
  const prev = await Result.findOne({ studentId: req.user._id, activityId: a._id }).lean();
  res.json({
    _id: a._id, title: a.title, category: a.category, description: a.description, objective: a.objective,
    difficulty: a.difficulty, duration: a.duration, instructions: a.instructions, totalMarks: totalMarks(a),
    questions: a.questions.map(q => ({ text: q.text, options: q.options, marks: q.marks })),
    previous: prev ? { score: prev.score, totalMarks: prev.totalMarks, percentage: prev.percentage, completedAt: prev.completedAt } : null
  });
});

// POST /api/results  { activityId, answers: [index, index, ...] }
exports.submitResult = asyncHandler(async (req, res) => {
  const { activityId, answers } = req.body || {};
  const a = await Activity.findById(activityId).lean();
  if (!a) return bad(res, 'Activity not found.', 404);
  if (!Array.isArray(answers) || answers.length !== a.questions.length) return bad(res, 'Please answer all the questions.');

  let score = 0, correctCount = 0;
  const details = [];
  for (let i = 0; i < a.questions.length; i++) {
    const q = a.questions[i];
    const sel = answers[i];
    if (!Number.isInteger(sel) || sel < 0 || sel >= q.options.length) return bad(res, 'Please answer all the questions.');
    const isCorrect = sel === q.answerIndex;
    if (isCorrect) { score += q.marks; correctCount++; }
    details.push({ text: q.text, options: q.options, selectedIndex: sel, correctIndex: q.answerIndex, isCorrect });
  }
  const total = totalMarks(a);
  const percentage = Math.round((score / total) * 1000) / 10;

  await Result.findOneAndUpdate(
    { studentId: req.user._id, activityId: a._id },
    { score, totalMarks: total, percentage, completedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({
    message: 'Activity submitted.', score, totalMarks: total, percentage,
    correctCount, incorrectCount: a.questions.length - correctCount, status: 'Completed', details
  });
});

exports.getResults = asyncHandler(async (req, res) => {
  const rows = await Result.find({ studentId: req.user._id }).populate('activityId', 'title category').sort({ completedAt: -1 }).lean();
  res.json(rows.filter(r => r.activityId).map(r => ({
    id: r._id, activity: r.activityId.title, category: r.activityId.category,
    score: r.score, totalMarks: r.totalMarks, percentage: r.percentage, completedAt: r.completedAt
  })));
});

// ---------- Progress & Certificate ----------
exports.getProgress = asyncHandler(async (req, res) => res.json(await computeProgress(req.user._id)));

exports.getCertificate = asyncHandler(async (req, res) => {
  const p = await computeProgress(req.user._id);
  if (!p.eligible) {
    return bad(res, 'Certificate locked. Finish the Pre-Assessment, at least ' + p.required +
      ' activities (you have ' + p.completedActivities + ') and the Post-Assessment.', 403);
  }
  let cert = await Certificate.findOne({ studentId: req.user._id });
  if (!cert) {
    cert = await Certificate.create({
      studentId: req.user._id,
      certificateId: 'STEM-' + new Date().getFullYear() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
      score: p.avgScore
    });
  }
  res.json({
    certificateId: cert.certificateId, studentName: req.user.name, school: req.user.school, class: req.user.class,
    program: PROGRAM_NAME, score: cert.score, issuedDate: cert.issuedDate
  });
});
