import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store.ts';
import { PLAYER_BY_ID } from '../data.ts';
import { searchPlayers } from '../lib/search.ts';
import { allTeamStatus, takenIndex } from '../selectors.ts';
import { PlayerCard } from '../components/PlayerCard.tsx';
import { AssignPanel } from '../components/AssignPanel.tsx';
import { usePlayerModal } from '../components/PlayerModal.tsx';

export function Asta() {
  const settings = useStore((s) => s.settings);
  const auction = useStore((s) => s.auction);
  const userData = useStore((s) => s.userData);
  const undoLast = useStore((s) => s.undoLast);
  const open = usePlayerModal((s) => s.open);

  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchPlayers(q, 12), [q]);
  const taken = useMemo(() => takenIndex(settings, auction), [settings, auction]);
  const teams = useMemo(() => allTeamStatus(settings, auction), [settings, auction]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  function pick(id: number) {
    setSelected(id);
    setQ('');
  }
  function afterAssign() {
    setSelected(null);
    setQ('');
    searchRef.current?.focus();
  }

  const recent = [...auction].sort((a, b) => b.ts - a.ts).slice(0, 15);

  return (
    <div className={`col${selected != null ? ' asta-picking' : ''}`} style={{ gap: 12 }}>
      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        <h1>Asta · {auction.length}/{settings.teams.length * 25}</h1>
        <button className="small" onClick={undoLast} disabled={!auction.length}>
          ↩ Annulla ultimo
        </button>
      </div>

      {/* strip crediti squadre */}
      <div className="row" style={{ gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {teams.map((t) => (
          <div
            key={t.id}
            className="panel"
            style={{ padding: '6px 10px', flex: 'none', textAlign: 'center', minWidth: 92 }}
          >
            <div className="small" style={{ fontWeight: t.isMine ? 700 : 500, whiteSpace: 'nowrap' }}>
              {t.nome}
              {t.isMine ? ' ★' : ''}
            </div>
            <div style={{ fontWeight: 700 }}>{t.residuo}</div>
            <div className="small muted">
              {t.slotOccupati}/{t.slotTotali} · max {t.maxOfferta}
            </div>
          </div>
        ))}
      </div>

      {selected == null ? (
        <>
          <div className="panel col" style={{ gap: 8, position: 'sticky', top: 8, zIndex: 5 }}>
            <input
              ref={searchRef}
              type="search"
              placeholder="Cerca giocatore…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && results[0]) {
                  e.preventDefault();
                  pick(results[0].id);
                }
                if (e.key === 'Escape') setQ('');
              }}
              style={{ fontSize: 17 }}
            />
            {q && (
              <div className="col" style={{ gap: 4 }}>
                {results.map((p, i) => {
                  const t = taken.get(p.id);
                  const rif = userData[p.id]?.targetMax;
                  return (
                    <button
                      key={p.id}
                      onClick={() => pick(p.id)}
                      style={{ textAlign: 'left', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '9px 10px' }}
                    >
                      {i === 0 && <span className="kbd">↵</span>}
                      <span className={`role ${p.ruolo}`}>{p.ruolo}</span>
                      <b>{p.alias ?? p.nome}</b>
                      <span className="muted small">{p.squadra}</span>
                      <span className="muted small">Qt {p.qtA}</span>
                      {p.convenienza != null && <span className="muted small">conv {p.convenienza}</span>}
                      {rif != null && (
                        <span className="badge fc" style={{ fontWeight: 700 }}>
                          rif. {rif}
                        </span>
                      )}
                      {t && <span className="badge med">preso · {t.teamNome} {t.prezzo}</span>}
                    </button>
                  );
                })}
                {!results.length && <span className="muted small">Nessun risultato.</span>}
              </div>
            )}
          </div>

          <div className="panel col" style={{ gap: 4 }}>
            <h3>Ultimi acquisti</h3>
            {recent.map((a) => {
              const p = PLAYER_BY_ID.get(a.playerId);
              const team = settings.teams.find((t) => t.id === a.teamId);
              if (!p) return null;
              return (
                <div key={a.playerId} className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="row" style={{ gap: 6 }} onClick={() => open(a.playerId)}>
                    <span className={`role ${p.ruolo}`}>{p.ruolo}</span>
                    <span>{p.alias ?? p.nome}</span>
                  </span>
                  <span className="muted small">
                    {team?.nome} · <b>{a.prezzo}</b>
                  </span>
                </div>
              );
            })}
            {!recent.length && <span className="muted small">Ancora nessun acquisto.</span>}
          </div>
        </>
      ) : (
        <>
          <div className="row">
            <button className="ghost small" onClick={() => setSelected(null)}>
              ← indietro
            </button>
          </div>
          <div className="panel">
            <PlayerCard key={selected} playerId={selected} />
          </div>
          <AssignPanel playerId={selected} onDone={afterAssign} />
        </>
      )}
    </div>
  );
}
