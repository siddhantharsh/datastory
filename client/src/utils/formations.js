import { formatNumberValue, formatColName } from './smartDetector';

// Color palette for categories
export const CATEGORY_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16', // lime
  '#14b8a6', // teal
];

export function getCategoryColorMap(categories) {
  const map = {};
  categories.forEach((cat, idx) => {
    map[cat] = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
  });
  return map;
}

// 1. CLUSTER FORMATION
export function layoutCluster(particles, categoricalCol, numericCol, width, height) {
  const groups = {};
  particles.forEach(p => {
    const cat = String(p.category ?? 'Unassigned');
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  });

  const groupNames = Object.keys(groups);
  if (!groupNames.length) return { labels: [], narrative: '' };

  const cols = Math.ceil(Math.sqrt(groupNames.length));
  const rowsCount = Math.ceil(groupNames.length / cols);
  const cellW = width / cols;
  const cellH = (height - 60) / rowsCount;

  const labels = [];
  let largest = { name: groupNames[0], count: 0 };
  let smallest = { name: groupNames[0], count: Infinity };

  groupNames.forEach((name, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const centerX = col * cellW + cellW / 2;
    const centerY = 40 + row * cellH + cellH / 2;
    const members = groups[name];

    if (members.length > largest.count) largest = { name, count: members.length };
    if (members.length < smallest.count) smallest = { name, count: members.length };

    // Sort by value descending (largest in center)
    members.sort((a, b) => b.value - a.value);

    const spacing = members.length > 200 ? 5 : 6;
    const rings = packIntoRings(members, centerX, centerY, spacing);

    let maxR = 0;
    rings.forEach(({ particle, x, y, r }) => {
      particle.targetX = Math.max(15, Math.min(width - 15, x));
      particle.targetY = Math.max(35, Math.min(height - 15, y));
      if (r > maxR) maxR = r;
    });

    labels.push({
      name,
      count: members.length,
      x: centerX,
      y: centerY - maxR - 16,
    });
  });

  const narrative = `Each dot is one record. Clusters sized by count — ${largest.name} has ${largest.count} records, ${smallest.name} has ${smallest.count}.`;

  return { labels, narrative };
}

function packIntoRings(particles, cx, cy, spacing) {
  const result = [];
  let ringRadius = 0;
  let particlesInRing = 1;
  let placedInRing = 0;
  let angle = 0;

  particles.forEach((p, i) => {
    if (i === 0) {
      result.push({ particle: p, x: cx, y: cy, r: 0 });
      return;
    }
    if (placedInRing >= particlesInRing) {
      ringRadius += spacing * 2.1;
      particlesInRing = Math.floor((2 * Math.PI * ringRadius) / (spacing * 2.1));
      placedInRing = 0;
      angle = Math.random() * 0.5; // slight stagger shift
    }
    const a = angle + (2 * Math.PI * placedInRing) / Math.max(1, particlesInRing);
    result.push({
      particle: p,
      x: cx + Math.cos(a) * ringRadius,
      y: cy + Math.sin(a) * ringRadius,
      r: ringRadius,
    });
    placedInRing++;
  });
  return result;
}

// 2. TIMELINE FORMATION
export function layoutTimeline(particles, dateCol, numericCol, categoricalCol, width, height) {
  const padding = { top: 50, right: 60, bottom: 60, left: 70 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const validParticles = particles.filter(p => p.date && !isNaN(new Date(p.date).getTime()));
  if (!validParticles.length) return { axes: null, narrative: 'No valid dates detected in dataset.' };

  const dates = validParticles.map(p => new Date(p.date).getTime());
  const values = particles.map(p => p.value);

  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  const dateSpan = maxDate - minDate || 1;
  const valSpan = maxVal - minVal || 1;

  particles.forEach((p, idx) => {
    let t = p.date ? new Date(p.date).getTime() : minDate;
    if (isNaN(t)) t = minDate;

    const xRatio = (t - minDate) / dateSpan;
    const yRatio = (p.value - minVal) / valSpan;

    // Small jitter to prevent exact overlapping points
    const jitterX = (idx % 3 - 1) * 2.5;
    const jitterY = (idx % 5 - 2) * 2.5;

    const rawX = padding.left + xRatio * plotW + jitterX;
    const rawY = padding.top + (1 - yRatio) * plotH + jitterY;

    p.targetX = Math.max(15, Math.min(width - 15, rawX));
    p.targetY = Math.max(15, Math.min(height - 15, rawY));
  });

  const axes = {
    padding,
    minDate,
    maxDate,
    minVal,
    maxVal,
    plotW,
    plotH
  };

  const numName = formatColName(numericCol || 'Value');
  const catName = formatColName(categoricalCol || 'Category');
  const narrative = `Every record plotted across time. Plotted by date and ${numName}. Color = ${catName}.`;

  return { axes, narrative };
}

// 3. RANK FORMATION
export function layoutRank(particles, numericCol, categoricalCol, width, height) {
  const sorted = [...particles].sort((a, b) => b.value - a.value);
  const barAreaWidth = width * 0.72;
  const barLeft = width * 0.14;
  const topPadding = 50;
  const rowHeight = Math.max(1.8, Math.min((height - 90) / sorted.length, 5));
  const maxVal = sorted[0]?.value || 1;

  sorted.forEach((p, i) => {
    const rawX = barLeft + (p.value / maxVal) * barAreaWidth;
    const rawY = topPadding + i * rowHeight;

    p.targetX = Math.max(15, Math.min(width - 15, rawX));
    p.targetY = Math.max(15, Math.min(height - 15, rawY));
  });

  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const numName = formatColName(numericCol || 'Value');

  const narrative = top && bottom
    ? `All ${particles.length} records ranked by ${numName}. Top: ${top.category} (${formatNumberValue(top.value)}). Bottom: ${bottom.category} (${formatNumberValue(bottom.value)}).`
    : `All records ranked by ${numName}.`;

  return { narrative, top, bottom, barLeft, barAreaWidth };
}

// 4. GRID FORMATION
export function layoutGrid(particles, categoricalCol, width, height) {
  // Sort by category first (so colors cluster), then by value descending
  const sorted = [...particles].sort((a, b) => {
    const catA = String(a.category ?? '');
    const catB = String(b.category ?? '');
    if (catA !== catB) return catA.localeCompare(catB);
    return b.value - a.value;
  });

  const count = sorted.length;
  const cols = Math.ceil(Math.sqrt(count * 1.3)); // slightly wider ratio
  const rowsCount = Math.ceil(count / cols);

  const cellSpacing = Math.min((width - 80) / cols, (height - 80) / rowsCount);
  const offsetX = (width - cols * cellSpacing) / 2;
  const offsetY = (height - rowsCount * cellSpacing) / 2;

  sorted.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const rawX = offsetX + col * cellSpacing + cellSpacing / 2;
    const rawY = offsetY + row * cellSpacing + cellSpacing / 2;

    p.targetX = Math.max(15, Math.min(width - 15, rawX));
    p.targetY = Math.max(15, Math.min(height - 15, rawY));
  });

  // Calculate breakdown percentages
  const catCounts = {};
  particles.forEach(p => {
    const cat = String(p.category ?? 'Other');
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });

  const breakdownArr = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cat, cnt]) => `${cat}: ${((cnt / count) * 100).toFixed(1)}%`);

  const breakdownStr = breakdownArr.join(', ');
  const narrative = `A unit chart — each square is one record. ${breakdownStr}.`;

  return { narrative };
}
