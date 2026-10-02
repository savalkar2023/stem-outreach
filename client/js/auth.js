/* auth.js - Login, Register, Verify OTP, Forgot Password, Reset Password pages */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const params = new URLSearchParams(location.search);

// ---------- LOGIN ----------
function loginPage() {
  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('email').value.trim(), password = $('password').value;
    if (!email || !password) return showAlert('Please enter email and password.');
    await busy($('btn'), async () => {
      try {
        const d = await api('/auth/login', { method: 'POST', body: { email, password }, noRedirect: true });
                flashToast('Login successful! Welcome, ' + d.user.name + '.');
        location.href = d.user.role === 'admin' ? '/admin/dashboard.html' : '/dashboard.html';   // role-based redirect
      } catch (err) {
        if (err.data && err.data.needsVerification) {
          showAlert(err.message + ' Redirecting...', 'warning');
          setTimeout(() => { location.href = '/verify-otp.html?purpose=register&email=' + encodeURIComponent(email); }, 1500);
        } else showAlert(err.message);
      }
    });
  });
}

// ---------- REGISTER ----------
function registerPage() {
  let photo = '';
  $('grade').innerHTML = '<option value="">Select class</option>' + Array.from({ length: 12 }, (_, i) => '<option>Class ' + (i + 1) + '</option>').join('');

  $('photo').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      photo = await resizeImage(f, 200);
      $('preview').src = photo;
      $('preview').classList.remove('d-none');
    } catch (err) { showAlert(err.message); }
  });

  $('regForm').addEventListener('submit', async e => {
    e.preventDefault();
    const b = {
      name: $('name').value.trim(), email: $('email').value.trim(), mobile: $('mobile').value.trim(),
      school: $('school').value.trim(), class: $('grade').value, city: $('city').value.trim(),
      password: $('password').value, confirmPassword: $('confirmPassword').value, profileImage: photo
    };
    if (!b.name || !b.email || !b.mobile || !b.school || !b.class || !b.city || !b.password || !b.confirmPassword) return showAlert('Please fill in all the fields.');
    if (!EMAIL_RE.test(b.email)) return showAlert('Please enter a valid email address.');
    if (!/^\+?[0-9]{10,13}$/.test(b.mobile)) return showAlert('Mobile number must have 10 to 13 digits.');
    if (b.password.length < 6 || !/[A-Za-z]/.test(b.password) || !/[0-9]/.test(b.password)) return showAlert('Password needs 6+ characters with letters and numbers.');
    if (b.password !== b.confirmPassword) return showAlert('Passwords do not match.');
    await busy($('btn'), async () => {
      try {
        const d = await api('/auth/register', { method: 'POST', body: b, noRedirect: true });
        if (d.devOtp) sessionStorage.setItem('stem_dev_otp', d.devOtp); else sessionStorage.removeItem('stem_dev_otp');
        location.href = '/verify-otp.html?purpose=register&email=' + encodeURIComponent(d.email);
      } catch (err) { showAlert(err.message); }
    });
  });
}

// ---------- VERIFY OTP ----------
function verifyPage() {
  const purpose = params.get('purpose') === 'reset' ? 'reset' : 'register';
  $('email').value = params.get('email') || '';
  const dev = sessionStorage.getItem('stem_dev_otp');
  if (dev) { $('devBox').classList.remove('d-none'); $('devBox').textContent = 'Development mode: your OTP is ' + dev + ' (it is also shown in the server terminal).'; }

  $('verifyForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('email').value.trim(), otp = $('otp').value.trim();
    if (!EMAIL_RE.test(email)) return showAlert('Please enter a valid email address.');
    if (!/^\d{6}$/.test(otp)) return showAlert('OTP must be 6 digits.');
    await busy($('btn'), async () => {
      try {
        const d = await api('/auth/verify-otp', { method: 'POST', body: { email, otp, purpose }, noRedirect: true });
        sessionStorage.removeItem('stem_dev_otp');
        if (purpose === 'reset') {
          sessionStorage.setItem('stem_reset_token', d.resetToken);
          location.href = '/reset-password.html';
        } else {
                    flashToast('Account created successfully! Please login.');
          location.href = '/login.html';
        }
      } catch (err) { showAlert(err.message); }
    });
  });

  $('resendBtn').addEventListener('click', async () => {
    const email = $('email').value.trim();
    if (!EMAIL_RE.test(email)) return showAlert('Enter your email first.');
    await busy($('resendBtn'), async () => {
      try {
        const d = await api('/auth/resend-otp', { method: 'POST', body: { email, purpose }, noRedirect: true });
        if (d.devOtp) { sessionStorage.setItem('stem_dev_otp', d.devOtp); $('devBox').classList.remove('d-none'); $('devBox').textContent = 'Development mode: your new OTP is ' + d.devOtp + ' (also in the server terminal).'; }
        showAlert(d.message, 'success');
      } catch (err) { showAlert(err.message); }
    });
  });
}

// ---------- FORGOT PASSWORD ----------
function forgotPage() {
  $('forgotForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('email').value.trim();
    if (!EMAIL_RE.test(email)) return showAlert('Please enter a valid email address.');
    await busy($('btn'), async () => {
      try {
        const d = await api('/auth/forgot-password', { method: 'POST', body: { email }, noRedirect: true });
        if (d.devOtp) sessionStorage.setItem('stem_dev_otp', d.devOtp); else sessionStorage.removeItem('stem_dev_otp');
        location.href = '/verify-otp.html?purpose=reset&email=' + encodeURIComponent(email);
      } catch (err) { showAlert(err.message); }
    });
  });
}

// ---------- RESET PASSWORD ----------
function resetPage() {
  const token = sessionStorage.getItem('stem_reset_token');
  if (!token) { showAlert('Please start from Forgot Password first.', 'warning'); }
  $('resetForm').addEventListener('submit', async e => {
    e.preventDefault();
    const password = $('password').value, confirmPassword = $('confirmPassword').value;
    if (!token) return showAlert('Please start from Forgot Password first.', 'warning');
    if (password.length < 6 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return showAlert('Password needs 6+ characters with letters and numbers.');
    if (password !== confirmPassword) return showAlert('Passwords do not match.');
    await busy($('btn'), async () => {
      try {
        const d = await api('/auth/reset-password', { method: 'POST', body: { resetToken: token, password, confirmPassword }, noRedirect: true });
        sessionStorage.removeItem('stem_reset_token');
        showAlert(d.message + ' Redirecting to Login...', 'success');
        setTimeout(() => { location.href = '/login.html'; }, 1500);
      } catch (err) { showAlert(err.message); }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  ({ login: loginPage, register: registerPage, verify: verifyPage, forgot: forgotPage, reset: resetPage })[document.body.dataset.page]();
});
