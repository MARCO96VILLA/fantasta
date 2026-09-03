export function fmt(n: number | null | undefined, dec = 2): string {
  if (n == null || Number.isNaN(n)) return '–';
  return n.toFixed(dec);
}

export function convClass(v: number | null): string {
  if (v == null) return 'mid';
  if (v >= 60) return 'hi';
  if (v <= 40) return 'lo';
  return 'mid';
}

export function range(r?: [number, number]): string {
  if (!r) return '–';
  return r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`;
}
