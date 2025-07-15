const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/database");
const cors = require("cors");
const path = require("path");
const surveyRoutes =require('./routes/ServayRoute')
const responseRoutes = require('./routes/responseRoutes.js') ;
const adminRoutes = require('./routes/adminRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
dotenv.config();
connectDB();
const app = express();
app.use(cors());

app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

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
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
