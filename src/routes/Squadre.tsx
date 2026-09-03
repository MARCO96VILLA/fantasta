import { useMemo } from 'react';
import { useStore } from '../store.ts';
import { allTeamStatus } from '../selectors.ts';
import { RUOLI } from '../types.ts';
import { usePlayerModal } from '../components/PlayerModal.tsx';

export function Squadre() {
  const settings = useStore((s) => s.settings);
  const auction = useStore((s) => s.auction);
  const open = usePlayerModal((s) => s.open);
  const teams = useMemo(() => allTeamStatus(settings, auction), [settings, auction]);

  return (
    <div className="col" style={{ gap: 12 }}>
      <h1>Tabellone squadre</h1>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))' }}>
        {teams.map((t) => (
          <div key={t.id} className="panel col" style={{ gap: 8 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2>
                {t.nome}
                {t.isMine ? ' ★' : ''}
              </h2>
              <span className="small muted">
                {t.slotOccupati}/{t.slotTotali}
              </span>
            </div>
            <div className="row small" style={{ justifyContent: 'space-between' }}>
              <span>
                Spesa <b>{t.spesa}</b> · Residuo <b>{t.residuo}</b>
              </span>
              <span className="muted">max {t.maxOfferta}</span>
            </div>
            <div className="bar">
              <i style={{ width: `${Math.min(100, (t.spesa / settings.budget) * 100)}%` }} />
            </div>

            {RUOLI.map((r) => {
              const info = t.perRuolo[r];
              const players = t.acquisti.filter((a) => a.player.ruolo === r);
              return (
                <div key={r}>
                  <div className="row small" style={{ justifyContent: 'space-between' }}>
                    <b>
                      <span className={`role ${r}`}>{r}</span> {info.occ}/{info.tot}
                    </b>
                    <span className="muted">{info.spesa}€</span>
                  </div>
                  {players.map(({ rec, player }) => (
                    <div key={rec.playerId} className="row small" style={{ justifyContent: 'space-between' }}>
                      <a onClick={() => open(rec.playerId)} style={{ cursor: 'pointer' }}>
                        {player.nome}
                      </a>
                      <span className="muted">
                        {rec.prezzo}
                        {rec.prezzo <= player.qtA ? '' : ' ▲'}
                      </span>
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, info.tot - info.occ) }).map((_, i) => (
                    <div key={i} className="small muted">
                      · libero
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
