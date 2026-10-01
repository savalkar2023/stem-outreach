// Pre-Assessment and Post-Assessment.
const Assessment = require('../models/Assessment');
const Result = require('../models/Result');
const asyncHandler = require('../utils/asyncHandler');
const { computeProgress } = require('../utils/progress');
const bank = require('../utils/assessmentQuestions');
const { MIN_ACTIVITIES_FOR_POST } = require('../config/constants');

const bad = (res, message, status = 400) => res.status(status).json({ message });

// Checks if the student may take this assessment now. Returns an error message or null.
async function blockReason(studentId, type) {
  if (!['pre', 'post'].includes(type)) return 'Invalid assessment type.';
  if (await Assessment.findOne({ studentId, type })) return 'You have already submitted the ' + (type === 'pre' ? 'Pre' : 'Post') + '-Assessment.';
  if (type === 'post') {
    if (!(await Assessment.findOne({ studentId, type: 'pre' }))) return 'Please complete the Pre-Assessment first.';
    const done = await Result.countDocuments({ studentId });
    if (done < MIN_ACTIVITIES_FOR_POST)
      return 'Complete at least ' + MIN_ACTIVITIES_FOR_POST + ' activities first (you have completed ' + done + ').';
  }
  return null;
}

// GET /api/assessment/status
exports.getStatus = asyncHandler(async (req, res) => {
  const [list, done] = await Promise.all([Assessment.find({ studentId: req.user._id }).lean(), Result.countDocuments({ studentId: req.user._id })]);
  const fmt = a => (a ? { score: a.score, total: a.totalQuestions, percentage: a.percentage, submittedAt: a.submittedAt } : null);
  const pre = list.find(a => a.type === 'pre'), post = list.find(a => a.type === 'post');
  res.json({
    pre: fmt(pre), post: fmt(post), completedActivities: done, required: MIN_ACTIVITIES_FOR_POST,
    canTakePre: !pre, canTakePost: !!pre && !post && done >= MIN_ACTIVITIES_FOR_POST
  });
});

// GET /api/assessment/questions?type=pre|post   (no answers are sent)
exports.getQuestions = asyncHandler(async (req, res) => {
  const type = req.query.type;
  const reason = await blockReason(req.user._id, type);
  if (reason) return bad(res, reason, 409);
  res.json({ type, questions: bank[type].map(q => ({ text: q.text, options: q.options })) });
});

// POST /api/assessment   { type, answers: [index, ...] }
exports.submit = asyncHandler(async (req, res) => {
  const { type, answers } = req.body || {};
  const reason = await blockReason(req.user._id, type);
  if (reason) return bad(res, reason, 409);
  const qs = bank[type];
  if (!Array.isArray(answers) || answers.length !== qs.length) return bad(res, 'Please answer all the questions.');

  let score = 0;
  const saved = [];
  for (let i = 0; i < qs.length; i++) {
    const sel = answers[i];
    if (!Number.isInteger(sel) || sel < 0 || sel >= qs[i].options.length) return bad(res, 'Please answer all the questions.');
    const isCorrect = sel === qs[i].answerIndex;
    if (isCorrect) score++;
    saved.push({ text: qs[i].text, selected: sel, correct: qs[i].answerIndex, isCorrect });
  }
  const percentage = Math.round((score / qs.length) * 1000) / 10;
  await Assessment.create({ studentId: req.user._id, type, questions: saved, score, totalQuestions: qs.length, percentage });

  const p = await computeProgress(req.user._id);
  res.status(201).json({
    message: (type === 'pre' ? 'Pre' : 'Post') + '-Assessment submitted.',
    type, score, total: qs.length, percentage, improvement: p.improvement,
    details: saved.map((s, i) => ({ text: s.text, options: qs[i].options, selectedIndex: s.selected, correctIndex: s.correct, isCorrect: s.isCorrect }))
  });
});
