import { useStore } from '../store.ts';

const EMPTY: string[] = [];

export function TagChips({ playerId }: { playerId: number }) {
  const tagDefs = useStore((s) => s.tagDefs);
  const activeRaw = useStore((s) => s.userData[playerId]?.tags);
  const active = activeRaw ?? EMPTY;
  const toggle = useStore((s) => s.togglePlayerTag);
  return (
    <span className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
      {tagDefs.map((t) => {
        const on = active.includes(t.id);
        return (
          <button
            key={t.id}
            className={`chip ${on ? '' : 'off'}`}
            style={on ? { background: t.color } : undefined}
            onClick={() => toggle(playerId, t.id)}
            title={on ? 'Rimuovi tag' : 'Aggiungi tag'}
          >
            {t.label}
          </button>
        );
      })}
    </span>
  );
}

export function TargetInput({ playerId }: { playerId: number }) {
  const v = useStore((s) => s.userData[playerId]?.targetMax);
  const set = useStore((s) => s.setTarget);
  return (
    <input
      type="number"
      min={1}
      placeholder="max €"
      value={v ?? ''}
      onChange={(e) => set(playerId, e.target.value === '' ? undefined : Number(e.target.value))}
      style={{ width: 80 }}
    />
  );
}

export function InteresseStars({ playerId }: { playerId: number }) {
  const v = useStore((s) => s.userData[playerId]?.interesse ?? 0);
  const set = useStore((s) => s.setInteresse);
  return (
    <span className="row" style={{ gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          className="ghost"
          style={{ padding: '0 2px', color: n <= v ? 'var(--warn)' : 'var(--text-dim)' }}
          onClick={() => set(playerId, (n === v ? undefined : n) as 1 | 2 | 3 | 4 | 5 | undefined)}
        >
          ★
        </button>
      ))}
    </span>
  );
}
