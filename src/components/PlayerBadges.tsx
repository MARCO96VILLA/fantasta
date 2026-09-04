import { FLAG_META } from '../types.ts';
import type { Player } from '../types.ts';

export function PlayerBadges({ player, showWhy }: { player: Player; showWhy?: boolean }) {
  const flags = FLAG_META.filter((f) => player.flags[f.key]);
  if (!flags.length) return null;
  return (
    <span className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
      {flags.map((f) => {
        const perche = player.flagPerche[f.key];
        return (
          <span key={f.key} className={`badge ${f.cls}`} title={perche ? `${f.label}: ${perche}` : f.descr}>
            {f.label}
            {player.senzaStoricoSerieA && perche?.startsWith('stima') ? ' ~' : ''}
          </span>
        );
      })}
      {showWhy && (
        <span className="col small muted" style={{ gap: 2, width: '100%', marginTop: 4 }}>
          {flags.map((f) => (
            <span key={f.key}>
              <b>{f.label}</b> — {player.flagPerche[f.key] ?? f.descr}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
