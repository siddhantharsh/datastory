const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Papa = require('papaparse');
const db = require('../db');
const { requireEditor } = require('../auth');

const uploadDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '../uploads');
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

function handleUpload(req, res) {
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

    // Use the actual header row (parsed.meta.fields), not the first data
    // row's keys — if the first row happens to have fewer fields than the
    // header (a ragged CSV), Object.keys(parsed.data[0]) silently drops
    // those columns from the entire dataset even though later rows have data
    // for them.
    const columns = parsed.meta.fields || Object.keys(parsed.data[0]);

    // Rows with more fields than the header get the overflow stuffed into
    // __parsed_extra by Papaparse — strip it so it doesn't leak in as a
    // bogus extra "column".
    const rows = parsed.data.map((row) => {
      if (row.__parsed_extra !== undefined) {
        const { __parsed_extra, ...rest } = row;
        return rest;
      }
      return row;
    });

    const warnings = [];
    if (parsed.errors && parsed.errors.length > 0) {
      const byType = {};
      parsed.errors.forEach((e) => {
        byType[e.type || e.code] = (byType[e.type || e.code] || 0) + 1;
      });
      Object.entries(byType).forEach(([type, count]) => {
        warnings.push(`${count} row${count === 1 ? '' : 's'} had a "${type}" formatting issue and may be misaligned.`);
      });
    }

    const name = req.body.name || path.parse(req.file.originalname).name;
    const id = `dataset-${Date.now()}`;
    const rowCount = rows.length;
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
      rows.forEach((row, idx) => {
        insertRow.run(id, idx, JSON.stringify(row));
      });
    });

    saveTransaction();

    // The row data now lives in SQLite; the raw upload on disk is redundant
    // and would otherwise grow server/uploads/ unbounded on every upload.
    fs.unlink(filePath, () => {});

    res.status(201).json({
      message: 'Dataset uploaded successfully',
      warnings,
      dataset: {
        id,
        name,
        filename: req.file.filename,
        rowCount,
        colCount,
        columns,
        createdAt,
        rows
      }
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process CSV file' });
  }
}

router.post('/', requireEditor, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File exceeds the 10MB upload limit' });
      }
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    handleUpload(req, res);
  });
});

module.exports = router;
