const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Papa = require('papaparse');
const db = require('../db');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true, dynamicTyping: true });

    if (!parsed.data || parsed.data.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty or invalid' });
    }

    const columns = Object.keys(parsed.data[0]);
    const name = req.body.name || path.parse(req.file.originalname).name;
    const id = `dataset-${Date.now()}`;
    const rowCount = parsed.data.length;
    const colCount = columns.length;
    const createdAt = new Date().toISOString();

    const insertDataset = db.prepare(`
      INSERT INTO datasets (id, name, filename, row_count, col_count, columns_json, created_at, is_sample)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);

    const insertRow = db.prepare(`
      INSERT INTO dataset_rows (dataset_id, row_index, row_data_json)
      VALUES (?, ?, ?)
    `);

    const saveTransaction = db.transaction(() => {
      insertDataset.run(id, name, req.file.filename, rowCount, colCount, JSON.stringify(columns), createdAt);
      parsed.data.forEach((row, idx) => {
        insertRow.run(id, idx, JSON.stringify(row));
      });
    });

    saveTransaction();

    res.status(201).json({
      message: 'Dataset uploaded successfully',
      dataset: {
        id,
        name,
        filename: req.file.filename,
        rowCount,
        colCount,
        columns,
        createdAt,
        rows: parsed.data
      }
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process CSV file' });
  }
});

module.exports = router;
