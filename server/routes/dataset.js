const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireEditor } = require('../auth');

// GET /api/datasets - List all datasets metadata
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM datasets ORDER BY is_sample DESC, created_at DESC');
    const datasets = stmt.all().map(d => ({
      ...d,
      columns: JSON.parse(d.columns_json),
      isSample: Boolean(d.is_sample)
    }));
    res.json(datasets);
  } catch (error) {
    console.error('List datasets error:', error);
    res.status(500).json({ error: 'Failed to retrieve datasets' });
  }
});

// GET /api/datasets/:id - Get dataset details and full rows
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('SELECT * FROM datasets WHERE id = ?');
    const dataset = stmt.get(id);

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const rowsStmt = db.prepare('SELECT row_data_json FROM dataset_rows WHERE dataset_id = ? ORDER BY row_index ASC');
    const rows = rowsStmt.all(id).map(r => JSON.parse(r.row_data_json));

    res.json({
      id: dataset.id,
      name: dataset.name,
      filename: dataset.filename,
      rowCount: dataset.row_count,
      colCount: dataset.col_count,
      columns: JSON.parse(dataset.columns_json),
      createdAt: dataset.created_at,
      isSample: Boolean(dataset.is_sample),
      rows
    });
  } catch (error) {
    console.error('Get dataset error:', error);
    res.status(500).json({ error: 'Failed to fetch dataset content' });
  }
});

// DELETE /api/datasets/:id - Delete custom dataset
router.delete('/:id', requireEditor, (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('SELECT * FROM datasets WHERE id = ?');
    const dataset = stmt.get(id);

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    if (dataset.is_sample) {
      return res.status(400).json({ error: 'Sample datasets cannot be deleted' });
    }

    db.prepare('DELETE FROM dataset_rows WHERE dataset_id = ?').run(id);
    db.prepare('DELETE FROM datasets WHERE id = ?').run(id);

    res.json({ message: 'Dataset deleted successfully' });
  } catch (error) {
    console.error('Delete dataset error:', error);
    res.status(500).json({ error: 'Failed to delete dataset' });
  }
});

module.exports = router;
