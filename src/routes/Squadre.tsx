import { useMemo, useState } from 'react';
import { useStore } from '../store.ts';
import { allTeamStatus } from '../selectors.ts';
import { RUOLI, RUOLO_LABEL } from '../types.ts';
import { META, STAGIONI_STORICHE } from '../data.ts';
import { usePlayerModal } from '../components/PlayerModal.tsx';

const STAG_CORRENTE = META.stagioneCorrente;
const STAG_PRECEDENTE = STAGIONI_STORICHE[0] as string | undefined;

/** "2026-27" -> "26/27" */
function seasonLabel(s: string) {
  return s
    .split('-')
    .map((x) => x.slice(-2))
    .join('/');
}

export function Squadre() {
  const settings = useStore((s) => s.settings);
  const auction = useStore((s) => s.auction);
  const open = usePlayerModal((s) => s.open);
  const teams = useMemo(() => allTeamStatus(settings, auction), [settings, auction]);

  const [teamId, setTeamId] = useState<string>(() => settings.myTeamId ?? settings.teams[0]?.id ?? '');
  const t = teams.find((x) => x.id === teamId) ?? teams[0];

  return (
    <div className="col" style={{ gap: 12 }}>
      <h1>Tabellone squadre</h1>

      <div className="team-tabs">
        {teams.map((tm) => (
          <button key={tm.id} className={tm.id === t?.id ? 'primary' : ''} onClick={() => setTeamId(tm.id)}>
            {tm.nome}
            {tm.isMine ? ' ★' : ''}
          </button>
        ))}
      </div>

      {!t && <p className="muted">Nessuna squadra configurata.</p>}

      {t && (
        <div className="panel col" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>
              {t.nome}
              {t.isMine ? ' ★' : ''}
            </h2>
            <span className="small muted">
              {t.slotOccupati}/{t.slotTotali}
            </span>
          </div>
          <div className="row small wrap" style={{ justifyContent: 'space-between' }}>
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
              <div key={r} className="col" style={{ gap: 2 }}>
                <div className="row small" style={{ justifyContent: 'space-between' }}>
                  <b>
                    <span className={`role ${r}`}>{r}</span> {RUOLO_LABEL[r]} · {info.occ}/{info.tot}
                  </b>
                  <span className="muted">{info.spesa}€</span>
                </div>
                {players.map(({ rec, player }) => {
                  const sCorr = player.storico[STAG_CORRENTE];
                  const sPrec = STAG_PRECEDENTE ? player.storico[STAG_PRECEDENTE] : undefined;
                  return (
                    <div key={rec.playerId} className="team-row">
                      <a className="pname" onClick={() => open(rec.playerId)} style={{ cursor: 'pointer' }}>
                        {player.alias ?? player.nome}
                      </a>
                      <span className="muted small">{player.squadra}</span>
                      <span className="muted small" title={`Presenze ${STAG_CORRENTE}`}>
                        {seasonLabel(STAG_CORRENTE)}: {sCorr ? `${sCorr.pv}pv` : '–'}
                      </span>
                      {STAG_PRECEDENTE && (
                        <span
                          className="muted small"
                          title={`Presenze/gol/assist ${STAG_PRECEDENTE}`}
                        >
                          {seasonLabel(STAG_PRECEDENTE)}: {sPrec ? `${sPrec.pv}pv ${sPrec.golFatti}g ${sPrec.assist}a` : '–'}
                        </span>
                      )}
                      <span className="pprice muted">
                        {rec.prezzo}
                        {rec.prezzo <= player.qtA ? '' : ' ▲'}
                      </span>
                    </div>
                  );
                })}
                {Array.from({ length: Math.max(0, info.tot - info.occ) }).map((_, i) => (
                  <div key={i} className="small muted">
                    · libero
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
