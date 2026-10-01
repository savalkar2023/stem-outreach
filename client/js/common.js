/* common.js - helpers shared by every page (login state, API calls, navbar, charts) */

// ---------- Login state (saved in the browser) ----------
const Auth = {
  get token() { return localStorage.getItem('stem_token'); },
  get user() { try { return JSON.parse(localStorage.getItem('stem_user')); } catch (e) { return null; } },
  save(token, user) { localStorage.setItem('stem_token', token); localStorage.setItem('stem_user', JSON.stringify(user)); },
  clear() { localStorage.removeItem('stem_token'); localStorage.removeItem('stem_user'); }
};

function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'; }

const CAT_ICON = { 'Computational Thinking': '🧠', 'Coding': '💻', 'Logic Building': '🧩', 'Problem Solving': '🔎', 'Science': '🔬', 'Technology': '🤖' };

// ---------- Talking to the server ----------
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (Auth.token) headers.Authorization = 'Bearer ' + Auth.token;
  let res;
  try {
    res = await fetch('/api' + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  } catch (e) {
    throw new Error('Cannot reach the server. Is it running?');
  }
  let data = {};
  try { data = await res.json(); } catch (e) { /* no JSON body */ }
  if (res.status === 401 && Auth.token && !opts.noRedirect) {      // session ended
    Auth.clear();
    location.href = '/login.html';
    throw new Error(data.message || 'Please login again.');
  }
  if (!res.ok) { const err = new Error(data.message || 'Something went wrong.'); err.status = res.status; err.data = data; throw err; }
  return data;
}

// ---------- Messages ----------
function showAlert(msg, type = 'danger', id = 'alert') {
  const el = $(id);
  if (!el) return;
  el.innerHTML = '<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert">' + esc(msg) +
    '<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Disables a button while an action runs.
async function busy(btn, fn) {
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Please wait...';
  try { await fn(); } finally { btn.disabled = false; btn.textContent = label; }
}

// ---------- Page protection + navbar ----------
function requireLogin(role) {
  if (!Auth.token || !Auth.user) { location.replace('/login.html'); return false; }
  if (role && Auth.user.role !== role) { location.replace(Auth.user.role === 'admin' ? '/admin/dashboard.html' : '/dashboard.html'); return false; }
  renderNav();
  return true;
}
function logout() { Auth.clear(); location.href = '/login.html'; }

function renderNav() {
  const box = $('nav');
  if (!box) return;
  const admin = Auth.user.role === 'admin';
  const links = admin
    ? [['/admin/dashboard.html', 'Dashboard'], ['/admin/students.html', 'Students'], ['/admin/activities.html', 'Activities'], ['/admin/results.html', 'Results'], ['/admin/reports.html', 'Reports']]
    : [['/dashboard.html', 'Dashboard'], ['/activities.html', 'Activities'], ['/assessment.html', 'Assessment'], ['/progress.html', 'Progress'], ['/certificate.html', 'Certificate'], ['/profile.html', 'Profile']];
  box.innerHTML = '<nav class="navbar navbar-expand-lg navbar-dark sticky-top"><div class="container">' +
    '<a class="navbar-brand" href="' + links[0][0] + '">🚀 STEM Outreach' + (admin ? ' <small class="text-info">Admin</small>' : '') + '</a>' +
    '<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menu"><span class="navbar-toggler-icon"></span></button>' +
    '<div class="collapse navbar-collapse" id="menu"><ul class="navbar-nav me-auto">' +
    links.map(l => '<li class="nav-item"><a class="nav-link' + (location.pathname === l[0] ? ' active' : '') + '" href="' + l[0] + '">' + l[1] + '</a></li>').join('') +
    '</ul><span class="navbar-text me-3 small">' + esc(Auth.user.name) + '</span>' +
    '<button class="btn btn-outline-info btn-sm" id="logoutBtn">Logout</button></div></div></nav>';
  $('logoutBtn').onclick = logout;
}

// ---------- Small UI helpers ----------
function statCard(icon, label, value) {
  return '<div class="col-6 col-lg-3"><div class="glass stat"><div class="stat-icon">' + icon + '</div><div class="stat-val">' + esc(value) +
    '</div><div class="stat-label">' + esc(label) + '</div></div></div>';
}
function avatar(u, size) {
  if (u.profileImage) return '<img class="avatar" src="' + esc(u.profileImage) + '" alt="Profile photo"' + (size ? ' style="width:' + size + 'px;height:' + size + 'px"' : '') + '>';
  return '<span class="avatar avatar-ph"' + (size ? ' style="width:' + size + 'px;height:' + size + 'px;font-size:' + size / 2.4 + 'px"' : '') + '>' + esc((u.name || '?').charAt(0).toUpperCase()) + '</span>';
}

// Shrinks a chosen photo to a small square JPEG (so it is saved in MongoDB easily).
function resizeImage(file, size = 200) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('This image cannot be used.'));
      img.onload = () => {
        const s = Math.min(img.width, img.height);
        const c = document.createElement('canvas');
        c.width = c.height = size;
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------- Charts (Chart.js) ----------
const COLORS = ['#00e0ff', '#7c5cff', '#3ecf9a', '#ffc93c', '#ff7b76', '#ff9f1c'];
const charts = {};
function drawChart(id, type, labels, datasets, options) {
  const el = $(id);
  if (!el || typeof Chart === 'undefined') return;
  if (charts[id]) charts[id].destroy();
  Chart.defaults.color = '#c9d3ff';
  Chart.defaults.borderColor = 'rgba(255,255,255,.12)';
  charts[id] = new Chart(el, { type, data: { labels, datasets }, options: Object.assign({ responsive: true, maintainAspectRatio: false }, options || {}) });
}
const PCT_AXIS = { scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } };
