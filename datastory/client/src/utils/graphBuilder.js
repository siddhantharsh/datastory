export function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

export function groupByAndAggregate(data, categoricalCol, numericCol, aggType = 'sum') {
  const groups = {};
  data.forEach(r => {
    const key = r[categoricalCol];
    if (key === undefined || key === null || key === '') return;
    if (!groups[key]) groups[key] = [];
    const val = numericCol && !isNaN(Number(r[numericCol])) ? Number(r[numericCol]) : 1;
    groups[key].push(val);
  });

  return Object.keys(groups).map(group => {
    const vals = groups[group];
    let value = 0;
    if (aggType === 'sum') value = vals.reduce((a, b) => a + b, 0);
    else if (aggType === 'mean') value = mean(vals);
    else value = vals.length;
    return { group, value };
  });
}

export function buildDailySeries(data, dateCol, numericCol) {
  const seriesMap = {};
  data.forEach(r => {
    const d = r[dateCol];
    if (!d) return;
    try {
      const dateStr = new Date(d).toISOString().split('T')[0];
      const val = numericCol && !isNaN(Number(r[numericCol])) ? Number(r[numericCol]) : 1;
      if (!seriesMap[dateStr]) seriesMap[dateStr] = 0;
      seriesMap[dateStr] += val;
    } catch(e) {}
  });
  return Object.keys(seriesMap)
    .sort((a, b) => new Date(a) - new Date(b))
    .map(date => seriesMap[date]);
}

export function pearsonCorrelation2(x, y) {
  if (!x || !y || x.length === 0 || y.length === 0) return 0;
  const minLen = Math.min(x.length, y.length);
  if (minLen === 0) return 0;
  const xSliced = x.slice(0, minLen);
  const ySliced = y.slice(0, minLen);

  const meanX = mean(xSliced);
  const meanY = mean(ySliced);

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < minLen; i++) {
    const dx = xSliced[i] - meanX;
    const dy = ySliced[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  return num / den;
}

export function buildGraphData(data, categoricalCol, numericCol, dateCol) {
  const grouped = groupByAndAggregate(data, categoricalCol, numericCol, 'sum');
  if (!grouped.length) return { nodes: [], links: [] };

  const values = grouped.map(g => g.value);
  const avg = mean(values);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);

  let nodes = grouped.map(g => ({
    id: g.group,
    value: g.value,
    radius: 18 + ((g.value - minVal) / (maxVal - minVal || 1)) * 42,
    relativePerformance: avg === 0 ? 0 : (g.value - avg) / avg,
    rowCount: data.filter(r => String(r[categoricalCol]) === String(g.group)).length,
  }));

  // Cap to top 60 nodes by value if too large
  if (nodes.length > 60) {
    nodes.sort((a, b) => b.value - a.value);
    nodes = nodes.slice(0, 60);
  }

  let links = [];
  if (dateCol) {
    const timeSeries = {};
    for (const node of nodes) {
      timeSeries[node.id] = buildDailySeries(
        data.filter(r => String(r[categoricalCol]) === String(node.id)),
        dateCol,
        numericCol
      );
    }
    for (let i = 0; i < nodes.length; i++) {
      const correlations = [];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const r = pearsonCorrelation2(timeSeries[nodes[i].id], timeSeries[nodes[j].id]);
        if (!isNaN(r) && Math.abs(r) > 0.5) {
          correlations.push({ target: nodes[j].id, r });
        }
      }
      correlations
        .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
        .slice(0, 3)
        .forEach(c => {
          const exists = links.some(l =>
            (l.source === nodes[i].id && l.target === c.target) ||
            (l.source === c.target && l.target === nodes[i].id)
          );
          if (!exists) links.push({ source: nodes[i].id, target: c.target, strength: Math.abs(c.r) });
        });
    }
  }

  return { nodes, links };
}
