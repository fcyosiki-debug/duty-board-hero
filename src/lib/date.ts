// 端末の現地時刻での「今日」（YYYY-MM-DD）。
// 以前は toISOString()（UTC）を使っていたため、日本時間 0:00〜8:59 が前日あつかいになっていた。
export function localToday(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
