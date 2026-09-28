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

// Strip common real-world numeric formatting ($1,234.56 / 45% / -€12) so those
// values still register as numeric instead of falling back to categorical/text.
const NUMERIC_STRIP_RE = /[$€£₹,%\s]/g;

export function parseNumericValue(val) {
  if (typeof val === 'number') return val;
  if (val === null || val === undefined) return NaN;
  const cleaned = String(val).trim().replace(NUMERIC_STRIP_RE, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return NaN;
  return Number(cleaned);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?$/;
const NUMERIC_DATE_RE = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/;
const MONTH_NAME_RE = /^(?:\d{1,2}\s+)?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?,?(?:\s+\d{1,2},?)?\s+\d{4}$/i;
const UNIX_SECONDS_RE = /^\d{10}$/;
const UNIX_MS_RE = /^\d{13}$/;
// Plausible epoch range: roughly year 2000 to 2033, to avoid mistaking generic
// large integer IDs for timestamps.
const MIN_EPOCH_S = 9.4e8;
const MAX_EPOCH_S = 2.0e9;

// Resolve a column's date format ONCE from a sample of its raw values, rather
// than guessing per-value — a per-value new Date("03/04/2024") is ambiguous
// (MM/DD vs DD/MM) and JS always assumes MM/DD, silently swapping day/month
// for values written the other way. Scanning the whole column lets us notice
// when any row's day component exceeds 12, which disambiguates the format for
// every row in that column.
export function detectDateFormat(values) {
  const samples = (values || [])
    .map((v) => (v === null || v === undefined ? '' : String(v).trim()))
    .filter(Boolean);
  if (!samples.length) return null;

  let isoCount = 0;
  let numericCount = 0;
  let monthNameCount = 0;
  let unixSCount = 0;
  let unixMsCount = 0;
  let dayGt12InFirst = false;
  let dayGt12InSecond = false;

  samples.forEach((s) => {
    if (ISO_DATE_RE.test(s)) {
      isoCount++;
      return;
    }
    const numericMatch = s.match(NUMERIC_DATE_RE);
    if (numericMatch) {
      numericCount++;
      const a = Number(numericMatch[1]);
      const b = Number(numericMatch[2]);
      if (a > 12) dayGt12InFirst = true;
      if (b > 12) dayGt12InSecond = true;
      return;
    }
    if (MONTH_NAME_RE.test(s) && !isNaN(new Date(s).getTime())) {
      monthNameCount++;
      return;
    }
    if (UNIX_SECONDS_RE.test(s)) {
      const n = Number(s);
      if (n >= MIN_EPOCH_S && n <= MAX_EPOCH_S) {
        unixSCount++;
        return;
      }
    }
    if (UNIX_MS_RE.test(s)) {
      const n = Number(s) / 1000;
      if (n >= MIN_EPOCH_S && n <= MAX_EPOCH_S) {
        unixMsCount++;
        return;
      }
    }
  });

  const dateLikeCount = isoCount + numericCount + monthNameCount + unixSCount + unixMsCount;
  if (dateLikeCount / samples.length < 0.7) return null;

  const counts = [
    ['ISO', isoCount],
    ['UNIX_S', unixSCount],
    ['UNIX_MS', unixMsCount],
    ['MONTHNAME', monthNameCount],
    [dayGt12InFirst ? 'DMY' : 'MDY', numericCount]
  ];
  counts.sort((a, b) => b[1] - a[1]);
  if (counts[0][1] === 0) return null;
  if (counts[0][0] === 'DMY' && dayGt12InSecond && !dayGt12InFirst) return 'MDY';
  return counts[0][0];
}

// Parse a single raw value into a Date, given the column-level format already
// resolved by detectDateFormat. Returns null (not Invalid Date) on failure so
// callers can fall back cleanly.
export function parseDateValue(raw, format) {
  if (raw === null || raw === undefined || raw === '') return null;
  const s = String(raw).trim();

  if (format === 'UNIX_S') {
    const n = Number(s);
    return isNaN(n) ? null : new Date(n * 1000);
  }
  if (format === 'UNIX_MS') {
    const n = Number(s);
    return isNaN(n) ? null : new Date(n);
  }
  if (format === 'DMY' || format === 'MDY') {
    const m = s.match(NUMERIC_DATE_RE);
    if (m) {
      const [, first, second, year] = m;
      const day = format === 'DMY' ? Number(first) : Number(second);
      const month = format === 'DMY' ? Number(second) : Number(first);
      const d = new Date(Number(year), month - 1, day);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
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
        if (typeof val === 'number' || (!isNaN(parseNumericValue(val)) && typeof val !== 'boolean')) {
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
    .map((r) => parseNumericValue(r[col]))
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
