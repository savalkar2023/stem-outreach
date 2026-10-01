// STEM Outreach for School Children - main server file.
// Serves the API (/api/...) and the website (../client) from ONE port.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');

if (!process.env.JWT_SECRET) {
  console.error('\nJWT_SECRET is missing. Create server/.env by copying server/.env.example (see README).\n');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// REST API (responses are never cached, so dashboards always show fresh data)
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/student'));
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found.' }));

// Website (the first page is client/index.html, which opens the Login page)
app.use(express.static(path.join(__dirname, '..', 'client')));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log('\nServer running.  Open Google Chrome and go to:  http://localhost:' + PORT + '\n');
  });
  server.on('error', err => {
    if (err.code === 'EADDRINUSE') console.error('\nPort ' + PORT + ' is already in use. Close the other server (Ctrl + C) or change PORT in server/.env\n');
    else console.error('Server error:', err.message);
    process.exit(1);
  });
});
