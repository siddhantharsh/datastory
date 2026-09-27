const express = require('express');
const router = express.Router();
const Papa = require('papaparse');
const db = require('../db');

// GET /api/export/:id?format=csv|json
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const format = (req.query.format || 'csv').toLowerCase();

    const stmt = db.prepare('SELECT * FROM datasets WHERE id = ?');
    const dataset = stmt.get(id);

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const rowsStmt = db.prepare('SELECT row_data_json FROM dataset_rows WHERE dataset_id = ? ORDER BY row_index ASC');
    const rows = rowsStmt.all(id).map(r => JSON.parse(r.row_data_json));

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${dataset.name}.json"`);
      return res.json(rows);
    } else {
      const csv = Papa.unparse(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${dataset.name}.csv"`);
      return res.send(csv);
    }
  } catch (error) {
    console.error('Export dataset error:', error);
    res.status(500).json({ error: 'Failed to export dataset' });
  }
});

module.exports = router;
