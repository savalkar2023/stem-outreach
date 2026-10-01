// Turns any error into a friendly JSON message.
exports.errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Server error.';

  if (err.type === 'entity.parse.failed') { status = 400; message = 'Invalid data sent to the server.'; }
  else if (err.type === 'entity.too.large') { status = 413; message = 'The image or data is too large.'; }
  else if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map(e => e.message).join(' '); }
  else if (err.code === 11000) { status = 409; message = 'This record already exists.'; }
  else if (err.name === 'CastError') { status = 400; message = 'Invalid ID.'; }
  else if (status === 500) { console.error(err); message = 'Server error. Please try again.'; }

  res.status(status).json({ message });
};
