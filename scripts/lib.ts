import * as XLSX from 'xlsx';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const RAW_DIR = join(process.cwd(), 'raw');

/** Legge il foglio `sheet` di un xlsx "a due intestazioni" (riga 0 = titolo, riga 1 = header). */
export function readSheet(path: string, sheet = 'Tutti'): Record<string, unknown>[] {
  const wb = XLSX.read(readFileSync(path), { type: 'buffer' });
  const ws = wb.Sheets[sheet];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false });
  const header = rows[1] as string[];
  const out: Record<string, unknown>[] = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    if (r == null || r[0] == null || r[0] === '') continue;
    const obj: Record<string, unknown> = {};
    header.forEach((h, j) => (obj[h] = r[j]));
    out.push(obj);
  }
  return out;
}

/** "Quotazioni_Fantacalcio_Stagione_2025_26.xlsx" -> "2025-26" */
export function seasonFromFilename(name: string): string | null {
  const m = name.match(/(\d{4})[_-](\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

export function findRaw(prefix: string): { path: string; season: string }[] {
  return readdirSync(RAW_DIR)
    .filter((f) => f.toLowerCase().startsWith(prefix.toLowerCase()) && f.endsWith('.xlsx'))
    .map((f) => ({ path: join(RAW_DIR, f), season: seasonFromFilename(f) ?? f }))
    .filter((x) => x.season)
    .sort((a, b) => a.season.localeCompare(b.season));
}

export function num(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function numOrNull(v: unknown): number | null {
  if (v == null || v === '' || v === 'nd') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Normalizza un nome per il matching fuzzy (fpedia). */
export function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[-'`]/g, ' ')
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
