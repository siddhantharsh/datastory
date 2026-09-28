const express = require('express');
const router = express.Router();
const db = require('../db');
const { optionalAuth, requireAuth } = require('../auth');

// owner_id IS NULL covers both the 3 bundled samples AND anything uploaded
// before per-user ownership existed — both stay public to everyone, so nothing
// that used to be visible becomes hidden by this change.
function getAccess(dataset, userId) {
  if (!dataset.owner_id) return 'public';
  if (userId && dataset.owner_id === userId) return 'owner';
  if (userId) {
    const shared = db
      .prepare('SELECT 1 FROM dataset_shares WHERE dataset_id = ? AND shared_with_user_id = ?')
      .get(dataset.id, userId);
    if (shared) return 'shared';
  }
  return null; // no access
}

// GET /api/datasets - list datasets visible to the current viewer
router.get('/', optionalAuth, (req, res) => {
  try {
    const all = db.prepare('SELECT * FROM datasets ORDER BY is_sample DESC, created_at DESC').all();
    const visible = all
      .map((d) => ({ d, access: getAccess(d, req.user?.id) }))
      .filter(({ access }) => access !== null)
      .map(({ d, access }) => ({
        ...d,
        columns: JSON.parse(d.columns_json),
        isSample: Boolean(d.is_sample),
        access
      }));
    res.json(visible);
  } catch (error) {
    console.error('List datasets error:', error);
    res.status(500).json({ error: 'Failed to retrieve datasets' });
  }
});

// GET /api/datasets/:id - dataset details and full rows (access-checked)
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const dataset = db.prepare('SELECT * FROM datasets WHERE id = ?').get(id);

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const access = getAccess(dataset, req.user?.id);
    if (!access) {
      return res.status(403).json({ error: 'You do not have access to this dataset' });
    }

    const rows = db
      .prepare('SELECT row_data_json FROM dataset_rows WHERE dataset_id = ? ORDER BY row_index ASC')
      .all(id)
      .map((r) => JSON.parse(r.row_data_json));

    res.json({
      id: dataset.id,
      name: dataset.name,
      filename: dataset.filename,
      rowCount: dataset.row_count,
      colCount: dataset.col_count,
      columns: JSON.parse(dataset.columns_json),
      createdAt: dataset.created_at,
      isSample: Boolean(dataset.is_sample),
      access,
      rows
    });
  } catch (error) {
    console.error('Get dataset error:', error);
    res.status(500).json({ error: 'Failed to fetch dataset content' });
  }
});

// DELETE /api/datasets/:id - owner only (samples/public datasets blocked)
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const dataset = db.prepare('SELECT * FROM datasets WHERE id = ?').get(id);

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }
    if (!dataset.owner_id) {
      return res.status(400).json({ error: 'Sample datasets cannot be deleted' });
    }
    if (dataset.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can delete this dataset' });
    }

    db.prepare('DELETE FROM dataset_rows WHERE dataset_id = ?').run(id);
    db.prepare('DELETE FROM datasets WHERE id = ?').run(id);

    res.json({ message: 'Dataset deleted successfully' });
  } catch (error) {
    console.error('Delete dataset error:', error);
    res.status(500).json({ error: 'Failed to delete dataset' });
  }
});

// POST /api/datasets/:id/share {email} - grant view access (owner only)
router.post('/:id/share', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'An email is required' });
    }

    const dataset = db.prepare('SELECT * FROM datasets WHERE id = ?').get(id);
    if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
    if (dataset.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can share this dataset' });
    }

    const targetUser = db
      .prepare('SELECT id, email, display_name FROM users WHERE email = ?')
      .get(String(email).trim().toLowerCase());
    if (!targetUser) {
      return res.status(404).json({ error: 'No account found with that email' });
    }
    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: "You already own this dataset" });
    }

    db.prepare(
      `INSERT INTO dataset_shares (dataset_id, shared_with_user_id, permission, created_at)
       VALUES (?, ?, 'view', ?)
       ON CONFLICT (dataset_id, shared_with_user_id) DO NOTHING`
    ).run(id, targetUser.id, new Date().toISOString());

    res.status(201).json({
      message: `Shared with ${targetUser.email}`,
      user: { id: targetUser.id, email: targetUser.email, displayName: targetUser.display_name }
    });
  } catch (error) {
    console.error('Share dataset error:', error);
    res.status(500).json({ error: 'Failed to share dataset' });
  }
});

// GET /api/datasets/:id/shares - list who has access (owner only)
router.get('/:id/shares', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const dataset = db.prepare('SELECT * FROM datasets WHERE id = ?').get(id);
    if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
    if (dataset.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can view the share list' });
    }

    const shares = db
      .prepare(
        `SELECT u.id, u.email, u.display_name, s.created_at
         FROM dataset_shares s JOIN users u ON u.id = s.shared_with_user_id
         WHERE s.dataset_id = ?
         ORDER BY s.created_at DESC`
      )
      .all(id)
      .map((r) => ({ id: r.id, email: r.email, displayName: r.display_name, sharedAt: r.created_at }));

    res.json(shares);
  } catch (error) {
    console.error('List shares error:', error);
    res.status(500).json({ error: 'Failed to list shares' });
  }
});

// DELETE /api/datasets/:id/shares/:userId - revoke access (owner only)
router.delete('/:id/shares/:userId', requireAuth, (req, res) => {
  try {
    const { id, userId } = req.params;
    const dataset = db.prepare('SELECT * FROM datasets WHERE id = ?').get(id);
    if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
    if (dataset.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can revoke access' });
    }

    db.prepare('DELETE FROM dataset_shares WHERE dataset_id = ? AND shared_with_user_id = ?').run(id, userId);
    res.json({ message: 'Access revoked' });
  } catch (error) {
    console.error('Revoke share error:', error);
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

module.exports = router;
