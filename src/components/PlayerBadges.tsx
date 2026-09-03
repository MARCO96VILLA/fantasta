import { FLAG_META } from '../types.ts';
import type { Player } from '../types.ts';

export function PlayerBadges({ player, all }: { player: Player; all?: boolean }) {
  const flags = FLAG_META.filter((f) => player.flags[f.key]);
  if (!flags.length && !all) return null;
  return (
    <span className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
      {flags.map((f) => (
        <span key={f.key} className={`badge ${f.cls}`}>
          {f.label}
        </span>
      ))}
      {player.fpedia.panchinaro && <span className="badge">Panchinaro</span>}
      {player.fpedia.outsider && <span className="badge">Outsider</span>}
    </span>
  );
}
