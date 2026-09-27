import Papa from 'papaparse';

// Detect if a string is a valid date
export function isDateString(str) {
  if (typeof str !== 'string' || !str.trim()) return false;
  if (
    str.match(/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/) ||
    str.match(/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/) ||
    str.match(/^\d{4}-\d{2}-\d{2}T/)
  ) {
    const d = new Date(str);
    return !isNaN(d.getTime());
  }
  return false;
}

// Infer column types from dataset rows
export function inferColumnTypes(rows, columns) {
  if (!rows || rows.length === 0 || !columns) return {};

  const types = {};
  const sampleSize = Math.min(rows.length, 100);

  columns.forEach((col) => {
    let numericCount = 0;
    let dateCount = 0;
    let nonNullCount = 0;

    for (let i = 0; i < sampleSize; i++) {
      const val = rows[i]?.[col];
      if (val !== undefined && val !== null && val !== '') {
        nonNullCount++;
        if (typeof val === 'number' || (!isNaN(Number(val)) && typeof val !== 'boolean')) {
          numericCount++;
        } else if (isDateString(val)) {
          dateCount++;
        }
      }
    }

    if (nonNullCount === 0) {
      types[col] = 'string';
    } else if (numericCount / nonNullCount > 0.8) {
      types[col] = 'number';
    } else if (dateCount / nonNullCount > 0.8) {
      types[col] = 'date';
    } else {
      types[col] = 'string';
    }
  });

  return types;
}

// Compute statistics for numeric columns
export function calculateColumnStats(rows, col) {
  if (!rows || rows.length === 0) return null;

  const values = rows
    .map((r) => Number(r[col]))
    .filter((v) => !isNaN(v) && v !== null && v !== undefined);

  if (values.length === 0) return null;

  values.sort((a, b) => a - b);

  const sum = values.reduce((acc, v) => acc + v, 0);
  const avg = sum / values.length;
  const min = values[0];
  const max = values[values.length - 1];
  const median =
    values.length % 2 === 0
      ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
      : values[Math.floor(values.length / 2)];

  // Variance & StdDev
  const variance = values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    count: values.length,
    sum: Number(sum.toFixed(2)),
    avg: Number(avg.toFixed(2)),
    min,
    max,
    median: Number(median.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2))
  };
}

// Helper to parse local CSV file using Papaparse
export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors && results.errors.length > 0 && (!results.data || results.data.length === 0)) {
          reject(new Error(results.errors[0].message));
        } else {
          resolve(results.data);
        }
      },
      error: (error) => reject(error)
    });
  });
}
