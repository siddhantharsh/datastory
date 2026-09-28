const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const Papa = require('papaparse');

const dataDir = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'data.db');
const db = new Database(dbPath);

// Enable WAL mode for performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS datasets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    filename TEXT NOT NULL,
    row_count INTEGER NOT NULL,
    col_count INTEGER NOT NULL,
    columns_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    is_sample INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS dataset_rows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id TEXT NOT NULL,
    row_index INTEGER NOT NULL,
    row_data_json TEXT NOT NULL,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
  );
`);

console.log('Database initialized successfully at:', dbPath);

// Auto-seed sample datasets into SQLite if empty
function seedSampleDatasets() {
  const sampleDir = path.join(__dirname, '../sample-datasets');
  if (!fs.existsSync(sampleDir)) return;

  const files = fs.readdirSync(sampleDir).filter(f => f.endsWith('.csv'));
  const checkStmt = db.prepare('SELECT COUNT(*) as count FROM datasets WHERE id = ?');
  const insertDataset = db.prepare(`
    INSERT INTO datasets (id, name, filename, row_count, col_count, columns_json, created_at, is_sample)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const insertRow = db.prepare(`
    INSERT INTO dataset_rows (dataset_id, row_index, row_data_json)
    VALUES (?, ?, ?)
  `);

  files.forEach((file) => {
    const name = path.parse(file).name;
    const id = `sample-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    const existing = checkStmt.get(id);
    if (existing.count > 0) return; // already seeded

    const filePath = path.join(sampleDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });

    if (parsed.data && parsed.data.length > 0) {
      const columns = parsed.meta.fields || Object.keys(parsed.data[0]);
      const rowCount = parsed.data.length;
      const colCount = columns.length;
      const createdAt = new Date().toISOString();

      const insertMany = db.transaction(() => {
        insertDataset.run(id, name, file, rowCount, colCount, JSON.stringify(columns), createdAt);
        parsed.data.forEach((row, idx) => {
          insertRow.run(id, idx, JSON.stringify(row));
        });
      });

      insertMany();
      console.log(`Seeded dataset: "${name}" (${rowCount} rows)`);
    }
  });
}

seedSampleDatasets();

module.exports = db;
