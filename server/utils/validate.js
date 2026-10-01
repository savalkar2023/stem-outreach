// Small input-validation helpers.
exports.isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v || '');
exports.isMobile = v => /^\+?[0-9]{10,13}$/.test(v || '');
exports.passwordError = p => {
  if (!p || p.length < 6) return 'Password must be at least 6 characters.';
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return 'Password must contain at least one letter and one number.';
  return null;
};
exports.text = v => String(v == null ? '' : v).trim();
