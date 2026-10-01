/* admin.js - admin pages: dashboard, students, activities, results, reports */

const CATEGORIES = ['Computational Thinking', 'Coding', 'Logic Building', 'Problem Solving', 'Science', 'Technology'];
const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const statusBadge = s => '<span class="badge ' + (s === 'Completed' ? 'text-bg-success' : s === 'In progress' ? 'text-bg-warning' : 'text-bg-secondary') + '">' + esc(s) + '</span>';
function debounce(fn, ms) { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; }

// ---------- DASHBOARD ----------
async function adminDashboard() {
  const s = await api('/admin/stats');
  $('cards').innerHTML = [
    ['🎓', 'Total Students', s.totalStudents], ['📚', 'Total Activities', s.totalActivities], ['✅', 'Completed Activities', s.completedActivities],
    ['📊', 'Average Score', s.averageScore + '%'], ['📈', 'Average Improvement', s.averageImprovement + '%'], ['🏅', 'Certificates Issued', s.certificatesIssued]
  ].map(c => statCard(c[0], c[1], c[2]).replace('col-6 col-lg-3', 'col-6 col-lg-2')).join('');
  drawChart('aPart', 'doughnut', ['Not started', 'In progress', 'Completed'], [{ data: [s.participation.notStarted, s.participation.inProgress, s.participation.completed], backgroundColor: ['rgba(255,255,255,.25)', COLORS[3], COLORS[2]] }]);
  drawChart('aComp', 'bar', s.activityCompletion.map(a => short(a.title, 16)), [{ data: s.activityCompletion.map(a => a.count), backgroundColor: COLORS[0] }], { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } });
  drawChart('aAvg', 'bar', s.activityCompletion.map(a => short(a.title, 16)), [{ data: s.activityCompletion.map(a => a.avg), backgroundColor: COLORS[1] }], PCT_AXIS);
  drawChart('aPre', 'bar', ['Pre', 'Post'], [{ data: [s.avgPre, s.avgPost], backgroundColor: [COLORS[1], COLORS[2]] }], PCT_AXIS);
  drawChart('aCat', 'bar', s.categoryPerformance.map(c => short(c.category, 12)), [{ data: s.categoryPerformance.map(c => c.avg), backgroundColor: COLORS }], PCT_AXIS);
}

// ---------- STUDENTS ----------
async function adminStudents() {
  $('fClass').innerHTML = '<option value="">All classes</option>' + Array.from({ length: 12 }, (_, i) => '<option>Class ' + (i + 1) + '</option>').join('');
  const load = async () => {
    const q = new URLSearchParams();
    if ($('search').value.trim()) q.set('search', $('search').value.trim());
    if ($('fClass').value) q.set('class', $('fClass').value);
    if ($('fStatus').value) q.set('status', $('fStatus').value);
    try {
      const rows = await api('/admin/students?' + q.toString());
      $('tbody').innerHTML = rows.length ? rows.map(r => '<tr><td>' + esc(r.name) + '</td><td>' + esc(r.email) + '</td><td>' + esc(r.school) + '</td><td>' + esc(r.class) + '</td><td>' + r.activities + '</td><td>' + r.avgScore + '%</td><td>' + statusBadge(r.status) + '</td>' +
        '<td class="text-nowrap"><button class="btn btn-sm btn-outline-info" data-v="' + r.id + '">View</button> <button class="btn btn-sm btn-outline-danger" data-d="' + r.id + '" data-n="' + esc(r.name) + '">Delete</button></td></tr>').join('')
        : '<tr><td colspan="8" class="text-secondary">No students found.</td></tr>';
      $('tbody').querySelectorAll('[data-v]').forEach(b => { b.onclick = () => viewStudent(b.dataset.v).catch(e => showAlert(e.message)); });
      $('tbody').querySelectorAll('[data-d]').forEach(b => { b.onclick = async () => {
        if (!confirm('Delete ' + b.dataset.n + ' and all their results? This cannot be undone.')) return;
        try { await api('/admin/students/' + b.dataset.d, { method: 'DELETE' }); showAlert('Student deleted.', 'success'); load(); } catch (e) { showAlert(e.message); }
      }; });
    } catch (e) { showAlert(e.message); }
  };
  const later = debounce(load, 300);
  $('search').addEventListener('input', later);
  $('fClass').addEventListener('change', load);
  $('fStatus').addEventListener('change', load);
  await load();
}

async function viewStudent(id) {
  const d = await api('/admin/students/' + id);
  const u = d.user, p = d.progress;
  const asRow = a => '<div class="mb-2"><b>' + (a.type === 'pre' ? 'Pre' : 'Post') + '-Assessment:</b> ' + a.score + '/' + a.totalQuestions + ' (' + a.percentage + '%) <span class="small text-secondary">' + fmtDate(a.submittedAt) + '</span><div class="small">' +
    a.questions.map((q, i) => '<span title="' + esc(q.text) + '">Q' + (i + 1) + (q.isCorrect ? '✅' : '❌') + '</span>').join(' ') + '</div></div>';
  $('sBody').innerHTML = '<div class="d-flex gap-3 align-items-center mb-3">' + avatar(u, 80) + '<div><h3 class="h5 mb-0">' + esc(u.name) + '</h3><div class="small text-secondary">' + esc(u.email) + ' &bull; ' + esc(u.mobile) + '</div><div class="small">' + esc(u.school) + ', ' + esc(u.class) + ', ' + esc(u.city) + '</div></div></div>' +
    '<div class="row g-2 mb-3">' + [['Activities', p.completedActivities + '/' + p.totalActivities], ['Avg Score', p.avgScore + '%'], ['Pre', p.pre ? p.pre.percentage + '%' : '-'], ['Post', p.post ? p.post.percentage + '%' : '-'], ['Improvement', p.improvement ? p.improvement.percent + '%' : '-'], ['Certificate', p.certificates ? 'Yes' : 'No']]
      .map(x => '<div class="col-4 col-md-2 text-center"><div class="stat-val fs-6">' + x[1] + '</div><div class="stat-label small">' + x[0] + '</div></div>').join('') + '</div>' +
    '<h4 class="h6">Assessments</h4>' + (d.assessments.length ? d.assessments.map(asRow).join('') : '<p class="text-secondary small">No assessments yet.</p>') +
    '<h4 class="h6 mt-3">Activity Results</h4>' + (d.results.length ? '<table class="table table-sm"><thead><tr><th>Activity</th><th>Category</th><th>Score</th><th>%</th><th>Date</th></tr></thead><tbody>' +
      d.results.map(r => '<tr><td>' + esc(r.activity) + '</td><td>' + esc(r.category) + '</td><td>' + r.score + '/' + r.totalMarks + '</td><td>' + r.percentage + '%</td><td>' + fmtDate(r.completedAt) + '</td></tr>').join('') + '</tbody></table>' : '<p class="text-secondary small">No activity results yet.</p>');
  new bootstrap.Modal($('sModal')).show();
}

// ---------- ACTIVITIES (add / edit / delete) ----------
async function adminActivities() {
  $('aCategory').innerHTML = CATEGORIES.map(c => '<option>' + c + '</option>').join('');
  const modal = new bootstrap.Modal($('aModal'));
  let list = [];

  const load = async () => {
    list = await api('/admin/activities');
    $('tbody').innerHTML = list.length ? list.map(a => '<tr><td>' + esc(a.title) + '</td><td>' + (CAT_ICON[a.category] || '') + ' ' + esc(a.category) + '</td><td>' + esc(a.difficulty) + '</td><td>' + a.duration + '</td><td>' + a.questions.length + '</td>' +
      '<td class="text-nowrap"><button class="btn btn-sm btn-outline-info" data-e="' + a._id + '">Edit / View</button> <button class="btn btn-sm btn-outline-danger" data-d="' + a._id + '" data-n="' + esc(a.title) + '">Delete</button></td></tr>').join('')
      : '<tr><td colspan="6" class="text-secondary">No activities yet.</td></tr>';
    $('tbody').querySelectorAll('[data-e]').forEach(b => { b.onclick = () => openEditor(list.find(a => a._id === b.dataset.e)); });
    $('tbody').querySelectorAll('[data-d]').forEach(b => { b.onclick = async () => {
      if (!confirm('Delete "' + b.dataset.n + '"? Student results for it will also be deleted.')) return;
      try { await api('/admin/activities/' + b.dataset.d, { method: 'DELETE' }); showAlert('Activity deleted.', 'success'); load(); } catch (e) { showAlert(e.message); }
    }; });
  };

  const qBlock = q => '<div class="q-block"><div class="d-flex justify-content-between"><b class="q-no"></b><button type="button" class="btn btn-sm btn-outline-danger rm-q">Remove</button></div>' +
    '<input class="form-control my-2 q-text" placeholder="Question text" value="' + esc(q.text) + '">' +
    '<div class="row g-2">' + [0, 1, 2, 3].map(i => '<div class="col-md-6"><input class="form-control q-opt" placeholder="Option ' + 'ABCD'[i] + '" value="' + esc((q.options || [])[i] || '') + '"></div>').join('') + '</div>' +
    '<div class="row g-2 mt-1"><div class="col-md-6"><label class="form-label small mb-0">Correct answer</label><select class="form-select q-ans">' + [0, 1, 2, 3].map(i => '<option value="' + i + '"' + (q.answerIndex === i ? ' selected' : '') + '>Option ' + 'ABCD'[i] + '</option>').join('') + '</select></div>' +
    '<div class="col-md-6"><label class="form-label small mb-0">Marks</label><input type="number" min="1" class="form-control q-marks" value="' + (q.marks || 1) + '"></div></div></div>';
  const renumber = () => $('qList').querySelectorAll('.q-no').forEach((n, i) => { n.textContent = 'Question ' + (i + 1); });
  const addQ = q => {
    $('qList').insertAdjacentHTML('beforeend', qBlock(q || { text: '', options: [], answerIndex: 0, marks: 1 }));
    $('qList').lastElementChild.querySelector('.rm-q').onclick = e => { e.target.closest('.q-block').remove(); renumber(); };
    renumber();
  };

  function openEditor(a) {
    $('aErr').innerHTML = '';
    $('aTitleHead').textContent = a ? 'Edit Activity' : 'Add Activity';
    $('aId').value = a ? a._id : '';
    $('aTitle').value = a ? a.title : ''; $('aCategory').value = a ? a.category : CATEGORIES[0];
    $('aDifficulty').value = a ? a.difficulty : 'Easy'; $('aDuration').value = a ? a.duration : 15;
    $('aObjective').value = a ? a.objective : ''; $('aDescription').value = a ? a.description : ''; $('aInstructions').value = a ? a.instructions : '';
    $('qList').innerHTML = '';
    (a ? a.questions : [null]).forEach(q => addQ(q));
    modal.show();
  }

  $('addBtn').onclick = () => openEditor(null);
  $('addQ').onclick = () => addQ(null);
  $('saveBtn').onclick = async () => {
    const questions = Array.from($('qList').querySelectorAll('.q-block')).map(b => ({
      text: b.querySelector('.q-text').value, options: Array.from(b.querySelectorAll('.q-opt')).map(i => i.value),
      answerIndex: Number(b.querySelector('.q-ans').value), marks: Number(b.querySelector('.q-marks').value)
    }));
    const body = { title: $('aTitle').value, category: $('aCategory').value, difficulty: $('aDifficulty').value, duration: Number($('aDuration').value),
      objective: $('aObjective').value, description: $('aDescription').value, instructions: $('aInstructions').value, questions };
    const id = $('aId').value;
    await busy($('saveBtn'), async () => {
      try {
        const d = await api(id ? '/admin/activities/' + id : '/admin/activities', { method: id ? 'PUT' : 'POST', body });
        modal.hide(); showAlert(d.message, 'success'); await load();
      } catch (e) { $('aErr').innerHTML = '<div class="alert alert-danger">' + esc(e.message) + '</div>'; }
    });
  };
  await load();
}

// ---------- RESULTS ----------
async function adminResults() {
  const rows = await api('/admin/results');
  const draw = () => {
    const q = $('search').value.trim().toLowerCase();
    const shown = rows.filter(r => !q || (r.student + ' ' + r.activity + ' ' + r.school).toLowerCase().includes(q));
    $('tbody').innerHTML = shown.length ? shown.map(r => '<tr><td>' + esc(r.student) + '</td><td>' + esc(r.school) + '</td><td>' + esc(r.activity) + '</td><td>' + esc(r.category) + '</td><td>' + r.score + '/' + r.totalMarks + '</td><td>' + r.percentage + '%</td><td>' + fmtDate(r.completedAt) + '</td></tr>').join('')
      : '<tr><td colspan="7" class="text-secondary">No results found.</td></tr>';
  };
  $('search').addEventListener('input', draw);
  draw();
}

// ---------- REPORTS ----------
async function adminReports() {
  const s = await api('/admin/reports');
  $('cards').innerHTML = [
    ['🎓', 'Total Students', s.totalStudents], ['🚀', 'Participation Rate', s.participationRate + '%'], ['📊', 'Average Score', s.averageScore + '%'],
    ['📝', 'Pre-Assessment Avg', s.avgPre + '%'], ['🎯', 'Post-Assessment Avg', s.avgPost + '%'], ['📈', 'Average Improvement', s.averageImprovement + '%']
  ].map(c => statCard(c[0], c[1], c[2]).replace('col-6 col-lg-3', 'col-6 col-lg-2')).join('');
  drawChart('rPre', 'bar', ['Pre', 'Post'], [{ data: [s.avgPre, s.avgPost], backgroundColor: [COLORS[1], COLORS[2]] }], PCT_AXIS);
  drawChart('rCat', 'bar', s.categoryPerformance.map(c => short(c.category, 12)), [{ data: s.categoryPerformance.map(c => c.avg), backgroundColor: COLORS }], PCT_AXIS);
  drawChart('rMost', 'bar', s.mostCompleted.map(a => short(a.title, 14)), [{ data: s.mostCompleted.map(a => a.count), backgroundColor: COLORS[3] }], { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } });

  $('csvBtn').onclick = async () => {
    try {
      const res = await fetch('/api/admin/reports/csv', { headers: { Authorization: 'Bearer ' + Auth.token } });
      if (!res.ok) throw new Error('Could not export the report.');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url; a.download = 'stem-report.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { showAlert(e.message); }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  if (!requireLogin('admin')) return;
  const page = ({ adminDashboard, adminStudents, adminActivities, adminResults, adminReports })[document.body.dataset.page];
  page().catch(e => showAlert(e.message));
});
