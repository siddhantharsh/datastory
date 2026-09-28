const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Papa = require('papaparse');
const XLSX = require('xlsx');
const db = require('../db');
const { requireAuth } = require('../auth');

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

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.numbers') {
      // Apple Numbers is a proprietary zip-of-protobuf format with no
      // maintained Node.js parser — rather than fail silently or produce
      // garbage, give a clear, actionable rejection instead of a generic error.
      return cb(new Error(
        'Numbers files aren’t directly supported — export as CSV or Excel from ' +
        'Numbers (File → Export To) and upload that instead.'
      ));
    }
    if (ACCEPTED_EXTENSIONS.includes(ext)) {
      return cb(null, true);
    }
    cb(new Error('Only CSV and Excel (.xlsx/.xls) files are allowed'));
  }
});

// Parses a CSV file's already-read text content into {columns, rows, warnings}.
function parseCsv(content) {
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true, dynamicTyping: true });

  if (!parsed.data || parsed.data.length === 0) {
    throw Object.assign(new Error('CSV file is empty or invalid'), { status: 400 });
  }

  // Use the actual header row (parsed.meta.fields), not the first data row's
  // keys — if the first row has fewer fields than the header (a ragged CSV),
  // Object.keys(parsed.data[0]) silently drops those columns entirely even
  // though later rows have data for them.
  const columns = parsed.meta.fields || Object.keys(parsed.data[0]);

  // Rows with more fields than the header get the overflow stuffed into
  // __parsed_extra by Papaparse — strip it so it doesn't leak in as a bogus
  // extra "column".
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

  return { columns, rows, warnings };
}

// Parses an Excel file (first worksheet only — multi-sheet selection is a
// documented roadmap item, not attempted here) into the same {columns, rows,
// warnings} shape parseCsv produces, so nothing downstream (smartDetector,
// storyGenerator, every chart) needs to know or care which format a dataset
// originally came from.
function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw Object.assign(new Error('Excel file has no worksheets'), { status: 400 });
  }
  const sheet = workbook.Sheets[sheetName];
  // defval: null ensures every row object has every header-implied key, even
  // for a row whose trailing cells are blank — the Excel equivalent of the
  // ragged-CSV column-loss bug, solved the same way.
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });

  if (!rows.length) {
    throw Object.assign(new Error('Excel file is empty or invalid'), { status: 400 });
  }

  const columns = Object.keys(rows[0]);
  return { columns, rows, warnings: [] };
}

function handleUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    const { columns, rows, warnings } = ext === '.csv'
      ? parseCsv(fs.readFileSync(filePath, 'utf8'))
      : parseExcel(filePath);

    const name = req.body.name || path.parse(req.file.originalname).name;
    const id = `dataset-${Date.now()}`;
    const rowCount = rows.length;
    const colCount = columns.length;
    const createdAt = new Date().toISOString();
    const ownerId = req.user.id;

    const insertDataset = db.prepare(`
      INSERT INTO datasets (id, name, filename, row_count, col_count, columns_json, created_at, is_sample, owner_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);

    const insertRow = db.prepare(`
      INSERT INTO dataset_rows (dataset_id, row_index, row_data_json)
      VALUES (?, ?, ?)
    `);

    const saveTransaction = db.transaction(() => {
      insertDataset.run(id, name, req.file.filename, rowCount, colCount, JSON.stringify(columns), createdAt, ownerId);
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
        access: 'owner',
        rows
      }
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to process file' });
  }
}

router.post('/', requireAuth, (req, res) => {
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
