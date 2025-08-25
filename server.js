const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./src/config/database");
const cors = require("cors");
const path = require("path");
const surveyRoutes = require('./src/routes/ServayRoute.js');
const responseRoutes = require('./src/routes/responseRoutes.js');
const adminRoutes = require('./src/routes/adminRoutes.js');
const analyticsRoutes = require('./src/routes/analyticsRoutes.js');
const voiceRoutes = require('./src/routes/voiceRoutes.js');
const categoryRoutes = require('./src/routes/categoryRoutes.js');
dotenv.config();
connectDB();
const app = express();

// Configure CORS to allow requests from any origin
const corsOptions = {
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With'],
  exposedHeaders: ['Content-Length']
};

app.use(cors(corsOptions));

app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve survey response page
app.get('/api/surveys/:id/respond', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/survey-response.html'));
});

//surveys routes
app.use('/api/surveys' , surveyRoutes)

//responses routes
app.use('/api/responses', responseRoutes);

// admin routes
app.use('/api/admin', adminRoutes);

// analysis Route
app.use('/api/analytics', analyticsRoutes);

// Audio upload routes
const audioUploadRoutes = require('./src/routes/uploadAudio');
app.use('/api/responses/audio', audioUploadRoutes);

// voice routes
app.use('/api/voices', voiceRoutes);

// category routes
app.use('/api/categories', categoryRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));