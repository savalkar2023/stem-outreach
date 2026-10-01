// Connects to MongoDB. If MongoDB is not running, a clear message is shown.
const mongoose = require('mongoose');

module.exports = async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stem_outreach';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected: ' + mongoose.connection.name);
  } catch (err) {
    console.error('\nMongoDB connection FAILED: ' + err.message);
    console.error('-> Make sure MongoDB is installed and running (see README, Step 2).');
    console.error('-> Check MONGO_URI in server/.env\n');
    process.exit(1);
  }
};
