const express = require('express');
const cors = require('cors');
const path = require('path');
require('./db'); // Initializes SQLite DB & auto-seeds samples

const uploadRoutes = require('./routes/upload');
const datasetRoutes = require('./routes/dataset');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Observatory API Server is operational', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/export', exportRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`================================================`);
  console.log(`Observatory Server running on http://localhost:${PORT}`);
  console.log(`================================================`);
});
