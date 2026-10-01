// Calculates a student's progress. Used by the dashboard, progress page, profile, certificate and admin pages.
const Activity = require('../models/Activity');
const Result = require('../models/Result');
const Assessment = require('../models/Assessment');
const Certificate = require('../models/Certificate');
const { CATEGORIES, MIN_ACTIVITIES_FOR_POST } = require('../config/constants');

const r1 = n => Math.round(n * 10) / 10;           // round to 1 decimal
const mean = arr => (arr.length ? r1(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);

// Improvement % = ((Post - Pre) / Pre) x 100.
// If Pre is 0 the formula cannot divide, so the gain is reported as the Post percentage itself.
function calcImprovement(pre, post) {
  const points = r1(post - pre);
  const preZero = pre === 0;
  return { points, percent: preZero ? r1(post) : r1((points / pre) * 100), preZero };
}

async function computeProgress(studentId) {
  const [activities, results, assessments, certificates] = await Promise.all([
    Activity.find().select('title category').lean(),
    Result.find({ studentId }).lean(),
    Assessment.find({ studentId }).lean(),
    Certificate.countDocuments({ studentId })
  ]);
  const byId = new Map(activities.map(a => [String(a._id), a]));
  const valid = results.filter(r => byId.has(String(r.activityId)));

  const pre = assessments.find(a => a.type === 'pre') || null;
  const post = assessments.find(a => a.type === 'post') || null;
  const fmt = a => (a ? { score: a.score, total: a.totalQuestions, percentage: a.percentage } : null);

  return {
    totalActivities: activities.length,
    completedActivities: valid.length,
    totalScore: valid.reduce((s, r) => s + r.score, 0),
    avgScore: mean(valid.map(r => r.percentage)),
    pre: fmt(pre),
    post: fmt(post),
    improvement: pre && post ? calcImprovement(pre.percentage, post.percentage) : null,
    categories: CATEGORIES.map(c => {
      const rs = valid.filter(r => byId.get(String(r.activityId)).category === c);
      return { category: c, avg: mean(rs.map(r => r.percentage)), count: rs.length };
    }),
    activityScores: valid.map(r => ({ title: byId.get(String(r.activityId)).title, percentage: r.percentage })),
    certificates: certificates,
    required: MIN_ACTIVITIES_FOR_POST,
    eligible: !!post && valid.length >= MIN_ACTIVITIES_FOR_POST
  };
}

module.exports = { computeProgress, calcImprovement, r1, mean };
