/** Rebuild visual rows; PDF content-stream order is not reading order. */
export function analyticPageText(items: Array<{ str?: string; transform?: number[] }>) {
  const remaining = items.filter(item => item.str?.trim() && item.transform).map(item => ({
    text: item.str!.trim(), x: item.transform![4], y: item.transform![5]
  }));
  const rows: { y: number; text: string }[] = [];
  const dates = remaining.filter(item => /^(?:\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})$/.test(item.text));
  for (const date of dates) {
    // A wrapped name straddles the centered grade/date. Assign each fragment
    // only to its closest date, never to two adjacent subjects.
    const cells = remaining.filter(item => Math.abs(item.y - date.y) <= 8 &&
      dates.reduce((best, candidate) => Math.abs(candidate.y - item.y) < Math.abs(best.y - item.y) ? candidate : best, date) === date);
    cells.sort((a, b) => a.x - b.x || b.y - a.y);
    rows.push({ y: date.y, text: cells.map(item => item.text).join(" ") });
    for (const cell of cells) remaining.splice(remaining.indexOf(cell), 1);
  }
  remaining.sort((a, b) => b.y - a.y || a.x - b.x);
  while (remaining.length) {
    const first = remaining.shift()!;
    const cells = [first];
    while (remaining.length && Math.abs(remaining[0].y - first.y) <= 2) cells.push(remaining.shift()!);
    cells.sort((a, b) => a.x - b.x);
    rows.push({ y: first.y, text: cells.map(item => item.text).join(" ") });
  }
  return rows.sort((a, b) => b.y - a.y).map(row => row.text).join("\n");
}
