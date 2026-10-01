// OTP generation + sending.
// Development mode: the OTP is printed in the server terminal.
// Real email: fill EMAIL_USER and EMAIL_PASSWORD in server/.env and it is sent by email.
const crypto = require('crypto');
const { OTP_MINUTES } = require('../config/constants');

exports.generateOtp = () => String(crypto.randomInt(100000, 1000000)); // always 6 digits

exports.sendOtp = async (email, otp, purpose) => {
  const why = purpose === 'register' ? 'verify your new account' : 'reset your password';

  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD }
      });
      await transporter.sendMail({
        from: '"STEM Outreach" <' + process.env.EMAIL_USER + '>',
        to: email,
        subject: 'Your STEM Outreach OTP',
        text: 'Your OTP to ' + why + ' is ' + otp + '. It is valid for ' + OTP_MINUTES + ' minutes.'
      });
      return { emailed: true };
    } catch (err) {
      console.error('Email sending failed, showing OTP in terminal instead:', err.message);
    }
  }

  console.log('\n=============== DEVELOPMENT OTP ===============');
  console.log(' Email   : ' + email);
  console.log(' Purpose : ' + why);
  console.log(' OTP     : ' + otp + '   (valid for ' + OTP_MINUTES + ' minutes)');
  console.log('===============================================\n');
  return { emailed: false };
};
