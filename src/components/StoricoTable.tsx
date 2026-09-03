import { META } from '../data.ts';
import type { Player } from '../types.ts';
import { fmt } from '../lib/format.ts';

const COLS: { key: keyof Player['storico'][string]; label: string; dec?: number }[] = [
  { key: 'pv', label: 'Pres', dec: 0 },
  { key: 'mv', label: 'MV' },
  { key: 'fm', label: 'FM' },
  { key: 'golFatti', label: 'Gol', dec: 0 },
  { key: 'assist', label: 'Assist', dec: 0 },
  { key: 'rigCalciati', label: 'Rig.calc', dec: 0 },
  { key: 'rigFatti', label: 'Rig.✓', dec: 0 },
  { key: 'amm', label: 'Amm', dec: 0 },
  { key: 'esp', label: 'Esp', dec: 0 },
];

export function StoricoTable({ player }: { player: Player }) {
  const seasons = [...META.stagioni].sort().reverse();
  const rows = seasons.filter((s) => player.storico[s]);
  if (!rows.length) return <p className="muted small">Nessuno storico in Serie A.</p>;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>Stagione</th>
            {COLS.map((c) => (
              <th key={c.key} className="num">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const st = player.storico[s];
            return (
              <tr key={s}>
                <td>
                  {s}
                  {s === META.stagioneCorrente && <span className="muted small"> (in corso)</span>}
                </td>
                {COLS.map((c) => {
                  const v = st[c.key] as number | null;
                  return (
                    <td key={c.key} className="num">
                      {c.dec === 0 ? (v ?? 0) : fmt(v, c.dec ?? 2)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
