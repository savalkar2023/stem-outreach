/* student.js - all student pages: dashboard, profile, activities, activity, assessment, progress, certificate */

// ---------- DASHBOARD ----------
async function dashboard() {
  const p = await api('/progress');
  $('welcome').textContent = 'Welcome, ' + Auth.user.name + '! 🚀';
  let next = 'Great work! Keep exploring activities.';
  if (!p.pre) next = 'Next step: take the Pre-Assessment.';
  else if (p.completedActivities < p.required) next = 'Next step: complete ' + (p.required - p.completedActivities) + ' more activit' + (p.required - p.completedActivities === 1 ? 'y' : 'ies') + '.';
  else if (!p.post) next = 'Next step: take the Post-Assessment.';
  else if (p.certificates || p.eligible) next = 'Well done! Your certificate is ready.';
  $('nextStep').textContent = next;
  $('cards').innerHTML = [
    ['📚', 'Total Activities', p.totalActivities], ['✅', 'Completed Activities', p.completedActivities],
    ['⭐', 'Total Score', p.totalScore], ['📊', 'Average Score', p.avgScore + '%'],
    ['📝', 'Pre-Assessment', p.pre ? p.pre.percentage + '%' : 'Not taken'], ['🎯', 'Post-Assessment', p.post ? p.post.percentage + '%' : 'Not taken'],
    ['📈', 'Improvement', p.improvement ? p.improvement.percent + '%' : '-'], ['🏅', 'Certificates', p.certificates]
  ].map(c => statCard(c[0], c[1], c[2])).join('');
}

// ---------- PROFILE ----------
async function profile() {
  $('pClass').innerHTML = Array.from({ length: 12 }, (_, i) => '<option>Class ' + (i + 1) + '</option>').join('');
  const show = d => {
    const u = d.user;
    $('pView').innerHTML = avatar(u) + '<h2 class="h5 mt-3 mb-0">' + esc(u.name) + '</h2><p class="text-secondary small">' + esc(u.email) + '</p>' +
      '<table class="table table-sm text-start"><tbody>' +
      [['Mobile', u.mobile], ['School', u.school], ['Class', u.class], ['City', u.city], ['Registered', fmtDate(u.createdAt)]].map(r => '<tr><th>' + r[0] + '</th><td>' + esc(r[1]) + '</td></tr>').join('') +
      '</tbody></table><div class="row g-2 text-center">' +
      [['Activities', d.stats.activitiesCompleted], ['Total Score', d.stats.totalScore], ['Average', d.stats.avgScore + '%'], ['Certificates', d.stats.certificates]]
        .map(s => '<div class="col-6"><div class="stat-val fs-5">' + esc(s[1]) + '</div><div class="stat-label small">' + s[0] + '</div></div>').join('') + '</div>';
    $('pName').value = u.name; $('pMobile').value = u.mobile; $('pSchool').value = u.school; $('pClass').value = u.class; $('pCity').value = u.city;
  };
  show(await api('/profile'));

  $('editForm').addEventListener('submit', async e => {
    e.preventDefault();
    await busy($('saveBtn'), async () => {
      try {
        const d = await api('/profile', { method: 'PUT', body: { name: $('pName').value, mobile: $('pMobile').value, school: $('pSchool').value, class: $('pClass').value, city: $('pCity').value } });
        Auth.save(Auth.token, Object.assign({}, Auth.user, { name: d.user.name, school: d.user.school, class: d.user.class, city: d.user.city }));
        showAlert(d.message, 'success'); show(await api('/profile')); renderNav();
      } catch (err) { showAlert(err.message); }
    });
  });

  $('photoInput').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const img = await resizeImage(f, 200);
      const d = await api('/profile', { method: 'PUT', body: { profileImage: img } });
      Auth.save(Auth.token, Object.assign({}, Auth.user, { profileImage: d.user.profileImage }));
      showAlert('Profile photo updated.', 'success'); show(await api('/profile'));
    } catch (err) { showAlert(err.message); }
  });

  $('pwForm').addEventListener('submit', async e => {
    e.preventDefault();
    await busy($('pwBtn'), async () => {
      try {
        const d = await api('/profile/password', { method: 'PUT', body: { currentPassword: $('curPw').value, newPassword: $('newPw').value, confirmPassword: $('confPw').value } });
        showAlert(d.message, 'success'); $('pwForm').reset();
      } catch (err) { showAlert(err.message); }
    });
  });
}

// ---------- ACTIVITIES LIST ----------
async function activities() {
  const list = await api('/activities');
  let cat = 'All';
  const draw = () => {
    const cats = ['All'].concat(Array.from(new Set(list.map(a => a.category))));
    $('filters').innerHTML = cats.map(c => '<button class="btn btn-sm ' + (c === cat ? 'btn-launch' : 'btn-outline-info') + '" data-c="' + esc(c) + '">' + (CAT_ICON[c] || '📚') + ' ' + esc(c) + '</button>').join('');
    $('filters').querySelectorAll('button').forEach(b => { b.onclick = () => { cat = b.dataset.c; draw(); }; });
    const shown = list.filter(a => cat === 'All' || a.category === cat);
    $('list').innerHTML = shown.length ? shown.map(a =>
      '<div class="col-md-6 col-lg-4"><div class="glass activity-card"><div class="d-flex justify-content-between"><span class="cat-icon">' + (CAT_ICON[a.category] || '📚') + '</span>' +
      (a.completed ? '<span class="badge text-bg-success align-self-start">Completed ' + a.percentage + '%</span>' : '<span class="badge badge-soft align-self-start">New</span>') + '</div>' +
      '<h2 class="h6 mt-2">' + esc(a.title) + '</h2><p class="small text-secondary">' + esc(a.description) + '</p>' +
      '<div class="small mb-3"><span class="badge badge-soft">' + esc(a.category) + '</span> <span class="badge badge-soft">' + esc(a.difficulty) + '</span> <span class="badge badge-soft">' + a.duration + ' min</span> <span class="badge badge-soft">' + a.totalMarks + ' marks</span></div>' +
      '<a class="btn btn-launch btn-sm" href="/activity.html?id=' + a._id + '">' + (a.completed ? 'Retake' : 'Start') + '</a></div></div>').join('')
      : '<p class="text-secondary">No activities found.</p>';
  };
  draw();
}

// ---------- ONE ACTIVITY (quiz) ----------
async function activity() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { location.href = '/activities.html'; return; }
  const a = await api('/activities/' + encodeURIComponent(id));
  $('head').innerHTML = '<a class="small" href="/activities.html">&larr; All activities</a><div class="glass mt-2 mb-3"><h1 class="h4">' + (CAT_ICON[a.category] || '') + ' ' + esc(a.title) + '</h1>' +
    '<p>' + esc(a.description) + '</p><div class="mb-2"><span class="badge badge-soft">' + esc(a.category) + '</span> <span class="badge badge-soft">' + esc(a.difficulty) + '</span> <span class="badge badge-soft">' + a.duration + ' min</span> <span class="badge badge-soft">' + a.totalMarks + ' marks</span></div>' +
    (a.objective ? '<p class="mb-1"><b>Learning objective:</b> ' + esc(a.objective) + '</p>' : '') + (a.instructions ? '<p class="mb-0"><b>Instructions:</b> ' + esc(a.instructions) + '</p>' : '') +
    (a.previous ? '<p class="mt-2 mb-0 text-info">Your last score: ' + a.previous.score + '/' + a.previous.totalMarks + ' (' + a.previous.percentage + '%). Submitting again replaces it.</p>' : '') + '</div>';

  $('body').innerHTML = '<form id="quizForm" novalidate>' + a.questions.map((q, i) =>
    '<div class="q-block"><p class="fw-semibold mb-2">' + (i + 1) + '. ' + esc(q.text) + ' <small class="text-secondary">(' + q.marks + ' mark' + (q.marks > 1 ? 's' : '') + ')</small></p>' +
    q.options.map((o, j) => '<label><input type="radio" class="form-check-input me-2" name="q' + i + '" value="' + j + '">' + esc(o) + '</label>').join('') + '</div>').join('') +
    '<button class="btn btn-launch" id="submitBtn" type="submit">Submit Answers</button></form>';

  $('quizForm').addEventListener('submit', async e => {
    e.preventDefault();
    const answers = [];
    for (let i = 0; i < a.questions.length; i++) {
      const c = document.querySelector('input[name="q' + i + '"]:checked');
      if (!c) return showAlert('Please answer question ' + (i + 1) + ' before submitting.', 'warning');
      answers.push(Number(c.value));
    }
    await busy($('submitBtn'), async () => {
      try {
        const r = await api('/results', { method: 'POST', body: { activityId: a._id, answers } });
        $('body').innerHTML = '<div class="glass mb-3 text-center"><div class="rocket">' + (r.percentage >= 60 ? '🎉' : '💪') + '</div><h2 class="h4 mt-2">' + r.score + ' / ' + r.totalMarks + ' &nbsp;(' + r.percentage + '%)</h2>' +
          '<p class="mb-1">✅ Correct: <b>' + r.correctCount + '</b> &nbsp; ❌ Incorrect: <b>' + r.incorrectCount + '</b></p><p class="text-success fw-semibold mb-0">Status: ' + r.status + '</p></div>' + reviewHtml(r.details) +
          '<div class="d-flex gap-2 mt-3"><a class="btn btn-launch" href="/activities.html">More Activities</a><a class="btn btn-outline-info" href="/progress.html">View Progress</a></div>';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) { showAlert(err.message); }
    });
  });
}

// Shows each question with the student's answer and the correct answer.
function reviewHtml(details) {
  return details.map((d, i) => '<div class="q-block ' + (d.isCorrect ? 'ans-ok' : 'ans-bad') + '"><p class="fw-semibold mb-1">' + (i + 1) + '. ' + esc(d.text) + '</p>' +
    '<div class="small">Your answer: ' + esc(d.options[d.selectedIndex]) + ' ' + (d.isCorrect ? '✅' : '❌') + '</div>' +
    (d.isCorrect ? '' : '<div class="small text-success">Correct answer: ' + esc(d.options[d.correctIndex]) + '</div>') + '</div>').join('');
}

// ---------- ASSESSMENT (pre / post) ----------
async function assessment() {
  const st = await api('/assessment/status');
  const card = (type, label, r, can, hint) => '<div class="col-md-6"><div class="glass h-100"><h2 class="h5">' + label + '</h2>' +
    (r ? '<p class="mb-1">Score: <b>' + r.score + '/' + r.total + '</b> (' + r.percentage + '%)</p><p class="small text-secondary">Submitted ' + fmtDate(r.submittedAt) + '</p><span class="badge text-bg-success">Completed</span>'
       : '<p class="text-secondary small">' + esc(hint) + '</p><button class="btn btn-launch" data-type="' + type + '"' + (can ? '' : ' disabled') + '>Start ' + label + '</button>') + '</div></div>';
  $('box').innerHTML = '<div class="row g-3">' +
    card('pre', 'Pre-Assessment', st.pre, st.canTakePre, '10 questions to check what you know before the activities.') +
    card('post', 'Post-Assessment', st.post, st.canTakePost, 'Unlocks after the Pre-Assessment and ' + st.required + ' completed activities (you have ' + st.completedActivities + ').') + '</div>';
  $('box').querySelectorAll('button[data-type]').forEach(b => { b.onclick = () => startQuiz(b.dataset.type).catch(e => showAlert(e.message)); });
}

async function startQuiz(type) {
  const d = await api('/assessment/questions?type=' + type);
  const label = type === 'pre' ? 'Pre-Assessment' : 'Post-Assessment';
  $('box').innerHTML = '<div class="glass mb-3"><h2 class="h5 mb-0">' + label + '</h2><p class="text-secondary small mb-0">Answer all ' + d.questions.length + ' questions. You can submit only once.</p></div><form id="quizForm" novalidate>' +
    d.questions.map((q, i) => '<div class="q-block"><p class="fw-semibold mb-2">' + (i + 1) + '. ' + esc(q.text) + '</p>' +
      q.options.map((o, j) => '<label><input type="radio" class="form-check-input me-2" name="q' + i + '" value="' + j + '">' + esc(o) + '</label>').join('') + '</div>').join('') +
    '<button class="btn btn-launch" id="submitBtn" type="submit">Submit ' + label + '</button></form>';
  $('quizForm').addEventListener('submit', async e => {
    e.preventDefault();
    const answers = [];
    for (let i = 0; i < d.questions.length; i++) {
      const c = document.querySelector('input[name="q' + i + '"]:checked');
      if (!c) return showAlert('Please answer question ' + (i + 1) + ' before submitting.', 'warning');
      answers.push(Number(c.value));
    }
    await busy($('submitBtn'), async () => {
      try {
        const r = await api('/assessment', { method: 'POST', body: { type, answers } });
        let cmp = '';
        if (type === 'post' && r.improvement) {
          const p = await api('/progress');
          cmp = '<div class="glass mb-3"><h3 class="h5">Your Improvement</h3><p class="mb-1">Pre-Assessment: <b>' + p.pre.percentage + '%</b> &rarr; Post-Assessment: <b>' + p.post.percentage + '%</b></p>' +
            '<p class="fs-4 text-info mb-0">Improvement: ' + r.improvement.percent + '% <small class="text-secondary">(' + (r.improvement.points >= 0 ? '+' : '') + r.improvement.points + ' percentage points' + (r.improvement.preZero ? '; pre-score was 0' : '') + ')</small></p></div>';
        }
        $('box').innerHTML = '<div class="glass mb-3 text-center"><div class="rocket">🎯</div><h2 class="h4 mt-2">' + r.score + ' / ' + r.total + ' (' + r.percentage + '%)</h2><p class="mb-0 text-success">' + esc(r.message) + '</p></div>' + cmp + reviewHtml(r.details) +
          '<div class="d-flex gap-2 mt-3"><a class="btn btn-launch" href="' + (type === 'pre' ? '/activities.html' : '/progress.html') + '">' + (type === 'pre' ? 'Go to Activities' : 'View Progress') + '</a><a class="btn btn-outline-info" href="/dashboard.html">Dashboard</a></div>';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) { showAlert(err.message); }
    });
  });
}

// ---------- PROGRESS ----------
async function progress() {
  const p = await api('/progress');
  $('cards').innerHTML = [
    ['📚', 'Total Activities', p.totalActivities], ['✅', 'Completed', p.completedActivities], ['📊', 'Average Activity Score', p.avgScore + '%'],
    ['📝', 'Pre-Assessment', p.pre ? p.pre.percentage + '%' : 'Not taken'], ['🎯', 'Post-Assessment', p.post ? p.post.percentage + '%' : 'Not taken'],
    ['📈', 'Improvement', p.improvement ? p.improvement.percent + '%' : '-']
  ].map(c => statCard(c[0], c[1], c[2])).join('');
  if (p.improvement) {
    $('impBox').innerHTML = '<div class="glass">Pre-Assessment: <b>' + p.pre.percentage + '%</b> &rarr; Post-Assessment: <b>' + p.post.percentage + '%</b> &mdash; Improvement: <b class="text-info">' + p.improvement.percent + '%</b> (' + (p.improvement.points >= 0 ? '+' : '') + p.improvement.points + ' percentage points' + (p.improvement.preZero ? '; pre-score was 0' : '') + ')</div>';
  }
  drawChart('cPrePost', 'bar', ['Pre-Assessment', 'Post-Assessment'], [{ data: [p.pre ? p.pre.percentage : 0, p.post ? p.post.percentage : 0], backgroundColor: [COLORS[1], COLORS[2]] }], PCT_AXIS);
  drawChart('cCat', 'bar', p.categories.map(c => c.category), [{ data: p.categories.map(c => c.avg), backgroundColor: COLORS }], PCT_AXIS);
  drawChart('cAct', 'bar', p.activityScores.map(a => a.title.length > 18 ? a.title.slice(0, 17) + '…' : a.title), [{ data: p.activityScores.map(a => a.percentage), backgroundColor: COLORS[0] }], PCT_AXIS);
  drawChart('cAll', 'doughnut', ['Completed', 'Remaining'], [{ data: [p.completedActivities, Math.max(0, p.totalActivities - p.completedActivities)], backgroundColor: [COLORS[2], 'rgba(255,255,255,.2)'] }]);
}

// ---------- CERTIFICATE ----------
async function certificate() {
  try {
    const c = await api('/certificate');
    $('box').innerHTML = '<div class="certificate"><div class="fs-2">🚀</div><p class="text-uppercase fw-bold mb-1" style="letter-spacing:.15rem">' + esc(c.program) + '</p><h1 class="h2">Certificate of STEM Participation</h1>' +
      '<p class="mt-3 mb-0">This is proudly presented to</p><div class="cert-name">' + esc(c.studentName) + '</div>' +
      '<p class="mb-1">of <b>' + esc(c.school) + '</b> (' + esc(c.class) + ')</p><p>for successfully completing the STEM activities and assessments with an overall score of <b>' + c.score + '%</b>.</p>' +
      '<div class="cert-meta"><span>Date: <b>' + fmtDate(c.issuedDate) + '</b></span><span>Certificate ID: <b>' + esc(c.certificateId) + '</b></span></div></div>' +
      '<div class="text-center mt-3 no-print"><button class="btn btn-launch" id="printBtn">Download Certificate (PDF)</button><p class="small text-secondary mt-2">In the print window choose "Save as PDF".</p></div>';
    $('printBtn').onclick = () => window.print();
  } catch (err) {
    $('box').innerHTML = '<div class="glass text-center"><div class="rocket">🔒</div><h1 class="h4 mt-2">Certificate locked</h1><p class="mb-3">' + esc(err.message) + '</p><a class="btn btn-launch" href="/dashboard.html">Back to Dashboard</a></div>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!requireLogin('student')) return;
  const page = ({ dashboard, profile, activities, activity, assessment, progress, certificate })[document.body.dataset.page];
  page().catch(e => showAlert(e.message));
});
