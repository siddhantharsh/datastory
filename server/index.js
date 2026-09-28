require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
require('./db'); // Initializes SQLite DB & auto-seeds samples

const uploadRoutes = require('./routes/upload');
const datasetRoutes = require('./routes/dataset');
const exportRoutes = require('./routes/export');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_DIST = path.join(__dirname, '../client/dist');

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Observatory API Server is operational', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/export', exportRoutes);

// Serve the built client (if present) so a single container/port can host
// both the API and the SPA behind one tunnel/reverse proxy.
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  // Express 5's router requires named wildcards (e.g. '/*splat') for
  // path-based catch-alls, so use a path-less middleware for the SPA
  // fallback instead — it matches whatever express.static didn't.
  app.use((req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

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
