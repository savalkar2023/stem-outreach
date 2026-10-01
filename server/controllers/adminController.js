// Admin features: dashboard stats, student management, activity management, results, reports, CSV export.
const User = require('../models/User');
const Activity = require('../models/Activity');
const Result = require('../models/Result');
const Assessment = require('../models/Assessment');
const Certificate = require('../models/Certificate');
const Otp = require('../models/Otp');
const asyncHandler = require('../utils/asyncHandler');
const { computeProgress, calcImprovement, r1, mean } = require('../utils/progress');
const { CATEGORIES, DIFFICULTIES } = require('../config/constants');

const bad = (res, message, status = 400) => res.status(status).json({ message });
const t = s => String(s == null ? '' : s).trim();
const esc = s => String(s == null ? '' : s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function groupBy(arr, key) {
  const m = new Map();
  arr.forEach(x => { const k = String(x[key]); if (!m.has(k)) m.set(k, []); m.get(k).push(x); });
  return m;
}

// One summary row per verified student (used by the table, stats and CSV).
async function studentRows() {
  const users = await User.find({ role: 'student', isVerified: true }).select('-password -profileImage').sort({ createdAt: -1 }).lean();
  const ids = users.map(u => u._id);
  const [acts, results, assess, certs] = await Promise.all([
    Activity.find().select('_id').lean(),
    Result.find({ studentId: { $in: ids } }).lean(),
    Assessment.find({ studentId: { $in: ids } }).lean(),
    Certificate.find({ studentId: { $in: ids } }).lean()
  ]);
  const valid = new Set(acts.map(a => String(a._id)));
  const rBy = groupBy(results.filter(r => valid.has(String(r.activityId))), 'studentId');
  const aBy = groupBy(assess, 'studentId');
  const certSet = new Set(certs.map(c => String(c.studentId)));

  return users.map(u => {
    const rs = rBy.get(String(u._id)) || [];
    const as = aBy.get(String(u._id)) || [];
    const pre = as.find(a => a.type === 'pre'), post = as.find(a => a.type === 'post');
    return {
      id: u._id, name: u.name, email: u.email, mobile: u.mobile, school: u.school, class: u.class, city: u.city,
      createdAt: u.createdAt,
      activities: rs.length,
      totalScore: rs.reduce((s, r) => s + r.score, 0),
      avgScore: mean(rs.map(r => r.percentage)),
      pre: pre ? pre.percentage : null,
      post: post ? post.percentage : null,
      improvement: pre && post ? calcImprovement(pre.percentage, post.percentage) : null,
      certificate: certSet.has(String(u._id)),
      status: post ? 'Completed' : (pre || rs.length ? 'In progress' : 'Not started')
    };
  });
}

// Numbers and chart data for the admin dashboard and reports page.
async function buildStats() {
  const rows = await studentRows();
  const ids = rows.map(r => r.id);
  const [activities, results, certificates] = await Promise.all([
    Activity.find().select('title category').lean(),
    Result.find({ studentId: { $in: ids } }).lean(),
    Certificate.countDocuments({ studentId: { $in: ids } })
  ]);
  const byId = new Map(activities.map(a => [String(a._id), a]));
  const valid = results.filter(r => byId.has(String(r.activityId)));
  const withBoth = rows.filter(r => r.improvement);
  const preVals = rows.filter(r => r.pre !== null).map(r => r.pre);
  const postVals = rows.filter(r => r.post !== null).map(r => r.post);

  const activityCompletion = activities.map(a => {
    const rs = valid.filter(r => String(r.activityId) === String(a._id));
    return { title: a.title, count: rs.length, avg: mean(rs.map(r => r.percentage)) };
  });
  return {
    totalStudents: rows.length,
    totalActivities: activities.length,
    completedActivities: valid.length,
    averageScore: mean(valid.map(r => r.percentage)),
    avgPre: mean(preVals),
    avgPost: mean(postVals),
    averageImprovement: mean(withBoth.map(r => r.improvement.percent)),
    averageImprovementPoints: mean(withBoth.map(r => r.improvement.points)),
    certificatesIssued: certificates,
    participationRate: rows.length ? r1((rows.filter(r => r.status !== 'Not started').length / rows.length) * 100) : 0,
    participation: {
      notStarted: rows.filter(r => r.status === 'Not started').length,
      inProgress: rows.filter(r => r.status === 'In progress').length,
      completed: rows.filter(r => r.status === 'Completed').length
    },
    activityCompletion,
    mostCompleted: [...activityCompletion].sort((a, b) => b.count - a.count).slice(0, 5),
    categoryPerformance: CATEGORIES.map(c => {
      const rs = valid.filter(r => byId.get(String(r.activityId)).category === c);
      return { category: c, avg: mean(rs.map(r => r.percentage)), count: rs.length };
    })
  };
}

exports.getStats = asyncHandler(async (req, res) => res.json(await buildStats()));
exports.getReports = asyncHandler(async (req, res) => res.json(await buildStats()));

// ---------- Students ----------
exports.listStudents = asyncHandler(async (req, res) => {
  const { search, school, class: grade, status } = req.query;
  let rows = await studentRows();
  if (search) { const re = new RegExp(esc(search), 'i'); rows = rows.filter(r => re.test(r.name) || re.test(r.email) || re.test(r.school)); }
  if (school) { const re = new RegExp(esc(school), 'i'); rows = rows.filter(r => re.test(r.school)); }
  if (grade) rows = rows.filter(r => r.class === grade);
  if (status) rows = rows.filter(r => r.status === status);
  res.json(rows);
});

exports.getStudent = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'student' }).select('-password').lean();
  if (!user) return bad(res, 'Student not found.', 404);
  const [progress, results, assessments] = await Promise.all([
    computeProgress(user._id),
    Result.find({ studentId: user._id }).populate('activityId', 'title category').sort({ completedAt: -1 }).lean(),
    Assessment.find({ studentId: user._id }).lean()
  ]);
  res.json({
    user, progress,
    results: results.filter(r => r.activityId).map(r => ({ activity: r.activityId.title, category: r.activityId.category, score: r.score, totalMarks: r.totalMarks, percentage: r.percentage, completedAt: r.completedAt })),
    assessments
  });
});

exports.deleteStudent = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'student' });
  if (!user) return bad(res, 'Student not found.', 404);
  await Promise.all([
    Result.deleteMany({ studentId: user._id }), Assessment.deleteMany({ studentId: user._id }),
    Certificate.deleteMany({ studentId: user._id }), Otp.deleteMany({ email: user.email })
  ]);
  await user.deleteOne();
  res.json({ message: 'Student deleted.' });
});

// ---------- Results ----------
exports.listResults = asyncHandler(async (req, res) => {
  const rows = await Result.find().populate('studentId', 'name email school class').populate('activityId', 'title category').sort({ completedAt: -1 }).lean();
  res.json(rows.filter(r => r.studentId && r.activityId).map(r => ({
    id: r._id, student: r.studentId.name, email: r.studentId.email, school: r.studentId.school, class: r.studentId.class,
    activity: r.activityId.title, category: r.activityId.category,
    score: r.score, totalMarks: r.totalMarks, percentage: r.percentage, completedAt: r.completedAt
  })));
});

// ---------- Activities (add / edit / delete / view) ----------
function cleanActivity(b) {
  const a = {
    title: t(b.title), category: t(b.category), description: t(b.description), objective: t(b.objective),
    difficulty: t(b.difficulty) || 'Easy', duration: Number(b.duration) || 15, instructions: t(b.instructions)
  };
  if (!a.title) return { error: 'Title is required.' };
  if (!CATEGORIES.includes(a.category)) return { error: 'Please choose a valid category.' };
  if (!a.description) return { error: 'Description is required.' };
  if (!DIFFICULTIES.includes(a.difficulty)) return { error: 'Invalid difficulty.' };
  if (a.duration < 1) return { error: 'Duration must be at least 1 minute.' };
  if (!Array.isArray(b.questions) || !b.questions.length) return { error: 'Add at least one question.' };
  a.questions = [];
  for (let i = 0; i < b.questions.length; i++) {
    const q = b.questions[i] || {};
    const options = (Array.isArray(q.options) ? q.options : []).map(t);
    const n = i + 1;
    if (!t(q.text)) return { error: 'Question ' + n + ': the question text is required.' };
    if (options.length < 2 || options.some(o => !o)) return { error: 'Question ' + n + ': please fill in all the options.' };
    const ai = Number(q.answerIndex);
    if (!Number.isInteger(ai) || ai < 0 || ai >= options.length) return { error: 'Question ' + n + ': choose the correct answer.' };
    a.questions.push({ text: t(q.text), options, answerIndex: ai, marks: Math.max(1, Math.floor(Number(q.marks) || 1)) });
  }
  return { data: a };
}

exports.listActivities = asyncHandler(async (req, res) => res.json(await Activity.find().sort({ createdAt: 1, _id: 1 }).lean()));

exports.getActivity = asyncHandler(async (req, res) => {
  const a = await Activity.findById(req.params.id).lean();
  if (!a) return bad(res, 'Activity not found.', 404);
  res.json(a);
});

exports.createActivity = asyncHandler(async (req, res) => {
  const { data, error } = cleanActivity(req.body || {});
  if (error) return bad(res, error);
  res.status(201).json({ message: 'Activity added.', activity: await Activity.create(data) });
});

exports.updateActivity = asyncHandler(async (req, res) => {
  const { data, error } = cleanActivity(req.body || {});
  if (error) return bad(res, error);
  const a = await Activity.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!a) return bad(res, 'Activity not found.', 404);
  res.json({ message: 'Activity updated.', activity: a });
});

exports.deleteActivity = asyncHandler(async (req, res) => {
  const a = await Activity.findByIdAndDelete(req.params.id);
  if (!a) return bad(res, 'Activity not found.', 404);
  await Result.deleteMany({ activityId: a._id });
  res.json({ message: 'Activity deleted.' });
});

// ---------- CSV export ----------
exports.exportCsv = asyncHandler(async (req, res) => {
  const rows = await studentRows();
  const cell = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const head = ['Name', 'Email', 'School', 'Class', 'City', 'Activities Completed', 'Average Score %', 'Pre-Assessment %', 'Post-Assessment %', 'Improvement %', 'Certificate', 'Status'];
  const lines = rows.map(r => [r.name, r.email, r.school, r.class, r.city, r.activities, r.avgScore,
    r.pre === null ? '' : r.pre, r.post === null ? '' : r.post, r.improvement ? r.improvement.percent : '',
    r.certificate ? 'Yes' : 'No', r.status].map(cell).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="stem-report.csv"');
  res.send('\uFEFF' + [head.map(cell).join(','), ...lines].join('\r\n'));
});
