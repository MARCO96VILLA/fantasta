import { META } from '../data.ts';
import type { Player, StagioneStats } from '../types.ts';
import { fmt } from '../lib/format.ts';

type Col = { key: keyof StagioneStats; label: string; dec?: number; title?: string };

const COLS_MOV: Col[] = [
  { key: 'pv', label: 'Pres', dec: 0 },
  { key: 'mv', label: 'MV', title: 'Media voto (senza bonus/malus)' },
  { key: 'fm', label: 'FM', title: 'Fantamedia (con bonus/malus)' },
  { key: 'golFatti', label: 'Gol', dec: 0 },
  { key: 'assist', label: 'Assist', dec: 0 },
  { key: 'rigCalciati', label: 'Rig.c', dec: 0, title: 'Rigori calciati' },
  { key: 'rigFatti', label: 'Rig.✓', dec: 0, title: 'Rigori segnati' },
  { key: 'amm', label: 'Amm', dec: 0 },
  { key: 'esp', label: 'Esp', dec: 0 },
];

const COLS_POR: Col[] = [
  { key: 'pv', label: 'Pres', dec: 0 },
  { key: 'mv', label: 'MV', title: 'Media voto' },
  { key: 'fm', label: 'FM', title: 'Fantamedia' },
  { key: 'golSubiti', label: 'Gol sub', dec: 0, title: 'Gol subiti' },
  { key: 'rigParati', label: 'Rig.par', dec: 0, title: 'Rigori parati' },
  { key: 'amm', label: 'Amm', dec: 0 },
  { key: 'esp', label: 'Esp', dec: 0 },
];

export function StoricoTable({ player }: { player: Player }) {
  const cols = player.ruolo === 'P' ? COLS_POR : COLS_MOV;
  const seasons = [...META.stagioni].sort().reverse();
  const rows = seasons.filter((s) => player.storico[s]);
  if (!rows.length) return <p className="muted small">Nessuno storico in Serie A.</p>;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>Stagione</th>
            {cols.map((c) => (
              <th key={c.key} className="num" title={c.title}>
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
                  {s.slice(2).replace('-', '/')}
                  {s === META.stagioneCorrente && <span className="muted small"> (in corso)</span>}
                </td>
                {cols.map((c) => {
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
