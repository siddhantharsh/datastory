// Smart Data Detection Engine for DataStory
// Automatically classifies dataset columns into Numeric, Categorical, Date, and High-Cardinality text

import { isDateString } from './csvHelpers';

export function detectColumnTypes(rows, columns) {
  if (!rows || !rows.length || !columns || !columns.length) {
    return {
      numericCols: [],
      categoricalCols: [],
      dateCol: null,
      highCardCols: [],
      types: {},
      uniqueValuesMap: {}
    };
  }

  const sampleSize = Math.min(rows.length, 300);
  const types = {};
  const uniqueValuesMap = {};

  columns.forEach((col) => {
    let numericCount = 0;
    let dateCount = 0;
    let nonNullCount = 0;
    const uniqueVals = new Set();

    for (let i = 0; i < sampleSize; i++) {
      const val = rows[i]?.[col];
      if (val !== undefined && val !== null && val !== '') {
        nonNullCount++;
        const strVal = String(val).trim();
        uniqueVals.add(strVal);

        if (typeof val === 'number' || (!isNaN(Number(val)) && typeof val !== 'boolean')) {
          numericCount++;
        }
        if (isDateString(strVal)) {
          dateCount++;
        }
      }
    }

    uniqueValuesMap[col] = uniqueVals.size;

    // Classification Rules:
    // 1. If 75%+ values match date format -> DATE
    // 2. If < 25 unique values (including discrete numbers like floor: 1,2,3,4 or bus_id) -> CATEGORICAL
    // 3. If 75%+ continuous numeric values -> NUMERIC
    // 4. Otherwise -> HIGH CARDINALITY TEXT
    if (nonNullCount === 0) {
      types[col] = 'high_cardinality';
    } else if (dateCount / nonNullCount > 0.7) {
      types[col] = 'date';
    } else if (uniqueVals.size < 25 && uniqueVals.size > 0) {
      // Small number of distinct values = categorical dimension (e.g. floor, department, status, route)
      types[col] = 'categorical';
    } else if (numericCount / nonNullCount > 0.7) {
      types[col] = 'numeric';
    } else {
      types[col] = 'high_cardinality';
    }
  });

  const numericCols = columns.filter((c) => types[c] === 'numeric');
  const categoricalCols = columns.filter((c) => types[c] === 'categorical');
  const dateCol = columns.find((c) => types[c] === 'date') || null;
  const highCardCols = columns.filter((c) => types[c] === 'high_cardinality');

  return {
    types,
    numericCols,
    categoricalCols,
    dateCol,
    highCardCols,
    uniqueValuesMap
  };
}

export function generateSmartDashboardConfig(rows, columns) {
  const meta = detectColumnTypes(rows, columns);
  const { numericCols, categoricalCols, dateCol } = meta;

  // Fallbacks if numericCols or categoricalCols are empty
  const allCols = columns || [];
  const num1 = numericCols[0] || allCols.find((c) => c !== dateCol) || 'records';
  const num2 = numericCols[1] || numericCols[0] || num1;
  const num3 = numericCols[2] || numericCols[0] || num1;

  const cat1 = categoricalCols[0] || (dateCol ? dateCol : allCols[0]);
  const cat2 = categoricalCols[1] || null;

  // Generate 4 KPI Configs
  const kpiConfigs = [
    {
      id: 'kpi-count',
      title: 'Total Records',
      col: null,
      metricType: 'COUNT'
    },
    {
      id: 'kpi-avg-1',
      title: numericCols[0] ? `Avg ${formatColName(numericCols[0])}` : 'Average Metric',
      col: numericCols[0] || null,
      metricType: 'AVG'
    },
    {
      id: 'kpi-max-2',
      title: numericCols[1] ? `Max ${formatColName(numericCols[1])}` : (numericCols[0] ? `Max ${formatColName(numericCols[0])}` : 'Peak Metric'),
      col: numericCols[1] || numericCols[0] || null,
      metricType: 'MAX'
    },
    {
      id: 'kpi-sum-3',
      title: numericCols[2] ? `Sum ${formatColName(numericCols[2])}` : (numericCols[0] ? `Sum ${formatColName(numericCols[0])}` : 'Total Sum'),
      col: numericCols[2] || numericCols[0] || null,
      metricType: 'SUM'
    }
  ];

  // Chart 1: Bar Chart
  const chart1 = {
    title: numericCols[0] ? `${formatColName(num1)} by ${formatColName(cat1)}` : `Records by ${formatColName(cat1)}`,
    type: 'bar',
    xAxisCol: cat1,
    yAxisCol: num1,
    groupByCol: cat2
  };

  // Chart 2: Line Chart
  const chart2 = {
    title: dateCol ? `Trend of ${formatColName(num2)} over Time` : `${formatColName(num2)} Trajectory`,
    type: 'line',
    xAxisCol: dateCol || cat1,
    yAxisCol: num2
  };

  // Chart 3: Full-Width Area / Composed Chart
  const chart3 = {
    title: dateCol ? `Multi-Metric Overview (${formatColName(dateCol)})` : `Multi-Metric Overview`,
    type: dateCol ? 'area' : 'composed',
    xAxisCol: dateCol || cat1,
    yAxisCols: numericCols.slice(0, 4)
  };

  return {
    meta,
    kpiConfigs,
    chart1,
    chart2,
    chart3
  };
}

export function formatColName(str) {
  if (!str) return '';
  return str
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function formatNumberValue(val) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(val) >= 1_000) return (val / 1_000).toFixed(1) + 'k';
  if (Number.isInteger(val)) return val.toLocaleString();
  return Number(val.toFixed(2)).toLocaleString();
}
