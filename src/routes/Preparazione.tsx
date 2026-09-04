import { useStore } from '../store.ts';
import { PLAYERS } from '../data.ts';
import { RUOLI } from '../types.ts';
import { usePlayerModal } from '../components/PlayerModal.tsx';
import { PlayerList } from '../components/PlayerList.tsx';

export function Preparazione() {
  const open = usePlayerModal((s) => s.open);

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        <h1>Preparazione</h1>
        <BudgetPerReparto />
      </div>

      <PlayerList onPick={(id) => open(id, false)} />
    </div>
  );
}

function BudgetPerReparto() {
  const settings = useStore((s) => s.settings);
  const userData = useStore((s) => s.userData);
  const perReparto = RUOLI.map((r) => {
    let sum = 0;
    for (const [id, u] of Object.entries(userData)) {
      const p = PLAYERS.find((x) => x.id === Number(id));
      if (p?.ruolo === r && u.targetMax) sum += u.targetMax;
    }
    return { r, sum, tetto: settings.tettiReparto[r] };
  });
  const tot = perReparto.reduce((n, x) => n + x.sum, 0);
  return (
    <div className="row wrap small" style={{ gap: 10 }}>
      {perReparto.map(({ r, sum, tetto }) => (
        <span key={r} style={{ color: tetto && sum > tetto ? 'var(--bad)' : undefined }}>
          <b>{r}</b> {sum}
          {tetto ? `/${tetto}` : ''}
        </span>
      ))}
      <span className="muted">obiettivi {tot}/{settings.budget}</span>
    </div>
  );
}
