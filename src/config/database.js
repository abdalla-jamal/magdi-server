const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Use a default MongoDB URI if not provided in environment variables
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://magdiyacoub:magdiyacoub123@cluster0.q7nxmjr.mongodb.net/magdiyacoub';

console.log("MONGO_URI:", MONGO_URI); // Debug

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`MongoDB connected successfully ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;