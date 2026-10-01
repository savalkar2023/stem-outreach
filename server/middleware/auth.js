// Checks the JWT token sent by the browser and loads the logged-in user.
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Please login first.' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'access') throw new Error('Wrong token type');
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isVerified) return res.status(401).json({ message: 'Account not found. Please login again.' });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Session expired. Please login again.' });
  }
};

// Role protection
exports.adminOnly = (req, res, next) =>
  req.user && req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Access denied. Admin only.' });

exports.studentOnly = (req, res, next) =>
  req.user && req.user.role === 'student' ? next() : res.status(403).json({ message: 'This page is for students only.' });
