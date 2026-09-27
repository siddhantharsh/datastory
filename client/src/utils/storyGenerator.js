// Narrative Engine & Mathematical Intelligence for DataStory
import { formatColName, formatNumberValue } from './smartDetector';

// Narratives are rendered via dangerouslySetInnerHTML — any value sourced from
// uploaded CSV data (category names, dates, column headers) must be escaped
// before interpolation, or a malicious cell value executes as HTML/JS.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function pearsonCorrelation(data, col1, col2) {
  if (!data || data.length < 2 || !col1 || !col2) return 0;

  const validData = data.filter(
    (r) =>
      r[col1] !== null &&
      r[col1] !== undefined &&
      !isNaN(Number(r[col1])) &&
      r[col2] !== null &&
      r[col2] !== undefined &&
      !isNaN(Number(r[col2]))
  );

  const n = validData.length;
  if (n < 2) return 0;

  const mean1 = validData.reduce((s, r) => s + Number(r[col1]), 0) / n;
  const mean2 = validData.reduce((s, r) => s + Number(r[col2]), 0) / n;

  let num = 0;
  let den1 = 0;
  let den2 = 0;

  for (const r of validData) {
    const d1 = Number(r[col1]) - mean1;
    const d2 = Number(r[col2]) - mean2;
    num += d1 * d2;
    den1 += d1 * d1;
    den2 += d2 * d2;
  }

  const denom = Math.sqrt(den1 * den2);
  if (denom === 0) return 0;
  return Number((num / denom).toFixed(2));
}

export function linearSlope(data, dateCol, numCol) {
  if (!data || data.length < 2 || !numCol) return 0;

  const sorted = [...data]
    .filter((r) => r[numCol] !== null && r[numCol] !== undefined && !isNaN(Number(r[numCol])))
    .sort((a, b) => {
      if (dateCol && a[dateCol] && b[dateCol]) {
        return new Date(a[dateCol]) - new Date(b[dateCol]);
      }
      return 0;
    });

  const n = sorted.length;
  if (n < 2) return 0;

  const meanX = (n - 1) / 2;
  const meanY = sorted.reduce((sum, r) => sum + Number(r[numCol]), 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - meanX;
    const dy = Number(sorted[i][numCol]) - meanY;
    num += dx * dy;
    den += dx * dx;
  }

  return den === 0 ? 0 : num / den;
}

export function generateStory(data, meta) {
  if (!data || !data.length || !meta) return null;

  const { dateCol, numericCols = [], categoricalCols = [], types = {} } = meta;
  const columns = Object.keys(types);

  const primaryNum = numericCols[0] || null;
  const secondaryNum = numericCols[1] || null;
  const primaryCat = categoricalCols[0] || null;

  return {
    overview: buildOverview(data, columns, dateCol, primaryCat),
    trend: dateCol && primaryNum ? buildTrend(data, dateCol, primaryNum) : null,
    breakdown: primaryCat && primaryNum ? buildBreakdown(data, primaryCat, primaryNum) : null,
    comparison: primaryNum && secondaryNum ? buildComparison(data, primaryNum, secondaryNum, dateCol || primaryCat) : null,
    standouts: primaryNum ? buildStandouts(data, primaryNum, primaryCat, dateCol) : null
  };
}

// Act 1: Overview
function buildOverview(data, columns, dateCol, primaryCat) {
  const rowCount = data.length;
  const colCount = columns.length;

  let narrativeText = '';

  if (dateCol) {
    const validDates = data
      .map((r) => r[dateCol])
      .filter((d) => d && !isNaN(new Date(d).getTime()))
      .sort((a, b) => new Date(a) - new Date(b));

    const minDate = escapeHtml(validDates[0] || 'start date');
    const maxDate = escapeHtml(validDates[validDates.length - 1] || 'end date');

    narrativeText = `You're looking at <span class="font-bold text-[#b5470b]">${rowCount.toLocaleString()} records</span> across <span class="font-bold text-[#161513]">${colCount} columns</span>, spanning <span class="font-bold text-[#161513]">${minDate}</span> to <span class="font-bold text-[#161513]">${maxDate}</span>.`;
  } else {
    const catColName = escapeHtml(primaryCat ? formatColName(primaryCat) : 'attributes');
    const uniqueVals = new Set(data.map((r) => r[primaryCat]).filter(Boolean));

    narrativeText = `You're looking at <span class="font-bold text-[#b5470b]">${rowCount.toLocaleString()} records</span> across <span class="font-bold text-[#161513]">${colCount} columns</span>, covering <span class="font-bold text-[#161513]">${uniqueVals.size} unique ${catColName}</span> values.`;
  }

  return {
    heading: 'At a Glance',
    narrative: narrativeText
  };
}

// Act 2: The Big Trend
function buildTrend(data, dateCol, numCol) {
  const slope = linearSlope(data, dateCol, numCol);
  const direction = slope >= 0 ? 'upward' : 'downward';

  const sorted = [...data]
    .filter((r) => r[numCol] !== null && r[numCol] !== undefined && !isNaN(Number(r[numCol])))
    .sort((a, b) => new Date(a[dateCol]) - new Date(b[dateCol]));

  if (!sorted.length) return null;

  let peak = sorted[0];
  let trough = sorted[0];

  sorted.forEach((r) => {
    const val = Number(r[numCol]);
    if (val > Number(peak[numCol])) peak = r;
    if (val < Number(trough[numCol])) trough = r;
  });

  const peakVal = formatNumberValue(Number(peak[numCol]));
  const troughVal = formatNumberValue(Number(trough[numCol]));
  const peakDate = String(peak[dateCol] || '');
  const troughDate = String(trough[dateCol] || '');

  const narrativeText = `<span class="font-bold text-[#161513]">${escapeHtml(formatColName(numCol))}</span> trended <span class="font-bold text-[#b5470b]">${direction}</span> over this period. It peaked at <span class="font-bold text-[#b5470b]">${peakVal}</span> on <span class="font-bold text-[#161513]">${escapeHtml(peakDate)}</span> and hit its lowest at <span class="font-bold text-[#6f6a62]">${troughVal}</span> on <span class="font-bold text-[#161513]">${escapeHtml(troughDate)}</span>.`;

  return {
    heading: 'The Big Trend',
    narrative: narrativeText,
    numCol,
    dateCol,
    direction,
    peak: { value: peakVal, rawValue: Number(peak[numCol]), date: peakDate, row: peak },
    trough: { value: troughVal, rawValue: Number(trough[numCol]), date: troughDate, row: trough }
  };
}

// Act 3: The Breakdown
function buildBreakdown(data, categoryCol, numCol) {
  const map = {};
  data.forEach((r) => {
    const cat = String(r[categoryCol] || 'Other').trim();
    const val = Number(r[numCol]) || 0;
    map[cat] = (map[cat] || 0) + val;
  });

  const sortedCats = Object.entries(map).sort((a, b) => b[1] - a[1]);
  if (!sortedCats.length) return null;

  const uniqueCount = sortedCats.length;
  const top = sortedCats[0];
  const bottom = sortedCats[sortedCats.length - 1];

  const topName = top[0];
  const topVal = top[1];
  const bottomName = bottom[0];
  const bottomVal = bottom[1];

  const ratio = (topVal / (bottomVal || 1)).toFixed(1);

  const narrativeText = `Among <span class="font-bold text-[#161513]">${uniqueCount} ${escapeHtml(formatColName(categoryCol))}</span> categories, <span class="font-bold text-[#161513]">${escapeHtml(topName)}</span> leads with <span class="font-bold text-[#b5470b]">${formatNumberValue(topVal)}</span> — <span class="font-bold text-[#b5470b]">${ratio}×</span> more than <span class="font-bold text-[#161513]">${escapeHtml(bottomName)}</span> at <span class="font-bold text-[#6f6a62]">${formatNumberValue(bottomVal)}</span>.`;

  return {
    heading: 'The Breakdown',
    narrative: narrativeText,
    categoryCol,
    numCol,
    sortedCats: sortedCats.slice(0, 10).map(([name, val]) => ({ name, value: Number(val.toFixed(2)) })),
    uniqueCount,
    top: { name: topName, value: formatNumberValue(topVal) },
    bottom: { name: bottomName, value: formatNumberValue(bottomVal) },
    ratio
  };
}

// Act 4: The Comparison
function buildComparison(data, col1, col2, xCol) {
  const r = pearsonCorrelation(data, col1, col2);
  const col1Name = formatColName(col1);
  const col2Name = formatColName(col2);
  const col1NameSafe = escapeHtml(col1Name);
  const col2NameSafe = escapeHtml(col2Name);

  let narrativeText = '';

  if (Math.abs(r) > 0.7) {
    narrativeText = `<span class="font-bold text-[#161513]">${col1NameSafe}</span> and <span class="font-bold text-[#161513]">${col2NameSafe}</span> move closely together (correlation: <span class="font-bold text-[#b5470b]">${r}</span>). When one rises, the other tends to follow.`;
  } else if (Math.abs(r) > 0.3) {
    narrativeText = `There's a moderate relationship between <span class="font-bold text-[#161513]">${col1NameSafe}</span> and <span class="font-bold text-[#161513]">${col2NameSafe}</span> (correlation: <span class="font-bold text-[#b5470b]">${r}</span>).`;
  } else {
    narrativeText = `<span class="font-bold text-[#161513]">${col1NameSafe}</span> and <span class="font-bold text-[#161513]">${col2NameSafe}</span> appear to move independently (correlation: <span class="font-bold text-[#6f6a62]">${r}</span>).`;
  }

  return {
    heading: 'The Comparison',
    narrative: narrativeText,
    col1,
    col2,
    xCol,
    correlation: r
  };
}

// Act 5: What Stands Out
function buildStandouts(data, numCol, categoryCol, dateCol) {
  const valid = [...data]
    .filter((r) => r[numCol] !== null && r[numCol] !== undefined && !isNaN(Number(r[numCol])))
    .sort((a, b) => Number(b[numCol]) - Number(a[numCol]));

  if (!valid.length) return null;

  const top5 = valid.slice(0, 5);
  const bottom5 = valid.slice(-5).reverse();

  const topRow = top5[0];
  const bottomRow = bottom5[0];

  const topVal = Number(topRow[numCol]);
  const bottomVal = Number(bottomRow[numCol]);

  const topCat = categoryCol ? String(topRow[categoryCol] || '') : '';
  const topDate = dateCol ? String(topRow[dateCol] || '') : '';

  const bottomCat = categoryCol ? String(bottomRow[categoryCol] || '') : '';
  const bottomDate = dateCol ? String(bottomRow[dateCol] || '') : '';

  const gapPercent = topVal > 0 ? (((topVal - bottomVal) / topVal) * 100).toFixed(0) : '0';

  const topContext = escapeHtml([topCat, topDate].filter(Boolean).join(', '));
  const bottomContext = escapeHtml([bottomCat, bottomDate].filter(Boolean).join(', '));

  const narrativeText = `The highest <span class="font-bold text-[#161513]">${escapeHtml(formatColName(numCol))}</span> recorded was <span class="font-bold text-[#b5470b]">${formatNumberValue(topVal)}</span>${topContext ? ` (${topContext})` : ''}. The lowest was <span class="font-bold text-[#6f6a62]">${formatNumberValue(bottomVal)}</span>${bottomContext ? ` (${bottomContext})` : ''} — a <span class="font-bold text-[#b5470b]">${gapPercent}%</span> gap.`;

  return {
    heading: 'What Stands Out',
    narrative: narrativeText,
    numCol,
    categoryCol,
    dateCol,
    top5,
    bottom5,
    gapPercent
  };
}
