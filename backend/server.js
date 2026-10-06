const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { connect } = require('./db');
const authRoutes = require('./routes/auth');
const requirementRoutes = require('./routes/requirements');
const checklistRoutes = require('./routes/checklist');
const aiRoutes = require('./routes/ai');
const reportRoutes = require('./routes/reports');
const employeeRoutes = require('./routes/employees');
const assessmentRoutes = require('./routes/assessments');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/checklist', checklistRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/assessments', assessmentRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'AI-Powered Requirement Analysis API is running.' });
});

app.use((err, req, res, next) => {
  console.error('Global server error:', err.stack || err);
  res.status(500).json({ message: err.message || 'An internal server error occurred.' });
});

connect()
  .then(() => {
    console.log(`MongoDB connected to ${process.env.DB_NAME || 'requirement_analysis'}`);
    app.listen(PORT, () => {
      console.log(`Backend server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });
