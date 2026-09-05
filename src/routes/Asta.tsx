import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store.ts';
import { PLAYER_BY_ID } from '../data.ts';
import { searchPlayers } from '../lib/search.ts';
import { allTeamStatus, takenIndex, type TeamStatus } from '../selectors.ts';
import { RUOLI, RUOLO_LABEL } from '../types.ts';
import type { Ruolo } from '../types.ts';
import { PlayerCard } from '../components/PlayerCard.tsx';
import { AssignPanel } from '../components/AssignPanel.tsx';
import { usePlayerModal } from '../components/PlayerModal.tsx';
import { PlayerList } from '../components/PlayerList.tsx';
import { SheetButton } from '../components/Sheet.tsx';
import { useCloseOnBack } from '../lib/useCloseOnBack.ts';

export function Asta() {
  const settings = useStore((s) => s.settings);
  const auction = useStore((s) => s.auction);
  const userData = useStore((s) => s.userData);
  const undoLast = useStore((s) => s.undoLast);
  const open = usePlayerModal((s) => s.open);

  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [fase, setFase] = useState<Ruolo | ''>('');
  const searchRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchPlayers(q, 12), [q]);
  const taken = useMemo(() => takenIndex(settings, auction), [settings, auction]);
  const teams = useMemo(() => allTeamStatus(settings, auction), [settings, auction]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useCloseOnBack(selected != null, () => setSelected(null));

  function pick(id: number) {
    setSelected(id);
    setQ('');
  }
  function afterAssign() {
    setSelected(null);
    setQ('');
    searchRef.current?.focus();
  }

  const recent = [...auction].sort((a, b) => b.ts - a.ts).slice(0, 30);

  return (
    <div className={`col${selected != null ? ' asta-picking' : ''}`} style={{ gap: 12 }}>
      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        <h1>Asta · {auction.length}/{settings.teams.length * 25}</h1>
        <div className="row wrap" style={{ gap: 6 }}>
          <SheetButton icon="👥" label="Squadre">
            {teams.map((t) => (
              <TeamPreview key={t.id} t={t} />
            ))}
          </SheetButton>
          <SheetButton icon="🕓" label="Ultimi" badge={recent.length || undefined}>
            {recent.map((a) => {
              const p = PLAYER_BY_ID.get(a.playerId);
              const team = settings.teams.find((tm) => tm.id === a.teamId);
              if (!p) return null;
              return (
                <div key={a.playerId} className="row" style={{ justifyContent: 'space-between' }}>
                  <a onClick={() => open(a.playerId)} style={{ cursor: 'pointer' }}>
                    <span className={`role ${p.ruolo}`}>{p.ruolo}</span> {p.alias ?? p.nome}
                  </a>
                  <span className="muted small">
                    {team?.nome} · <b>{a.prezzo}</b>
                  </span>
                </div>
              );
            })}
            {!recent.length && <span className="muted small">Ancora nessun acquisto.</span>}
          </SheetButton>
          <button className="small" onClick={undoLast} disabled={!auction.length}>
            ↩ Annulla ultimo
          </button>
        </div>
      </div>

      <div className="row wrap" style={{ gap: 6, alignItems: 'center' }}>
        <span className="small muted">Fase asta:</span>
        <button className={fase === '' ? 'primary' : ''} onClick={() => setFase('')}>
          Tutti i ruoli
        </button>
        {RUOLI.map((r) => (
          <button key={r} className={fase === r ? 'primary' : ''} onClick={() => setFase(r)}>
            <span className={`role ${r}`} style={{ marginRight: 5 }}>
              {r}
            </span>
            {RUOLO_LABEL[r]}
          </button>
        ))}
      </div>

      <div hidden={selected != null} className="col" style={{ gap: 12 }}>
        <div className="panel col" style={{ gap: 8, position: 'sticky', top: 8, zIndex: 5 }}>
          <input
            ref={searchRef}
            type="search"
            placeholder="Cerca giocatore e premi Invio…"
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

        <PlayerList onPick={pick} showNameFilter={false} ruolo={fase} onRuoloChange={setFase} />
      </div>

      {selected != null && (
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

function TeamPreview({ t }: { t: TeamStatus }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontWeight: t.isMine ? 700 : 500 }}>
          {t.nome}
          {t.isMine ? ' ★' : ''}
        </div>
        <div className="small muted">
          {RUOLI.map((r) => (
            <span key={r} style={{ marginRight: 8 }}>
              <span className={`role ${r}`} style={{ width: 15, height: 15, fontSize: 9, marginRight: 2 }}>
                {r}
              </span>
              {t.perRuolo[r].occ}/{t.perRuolo[r].tot}
            </span>
          ))}
        </div>
      </div>
      <div className="small" style={{ textAlign: 'right' }}>
        <div>
          <b>{t.residuo}€</b>
        </div>
        <div className="muted">max {t.maxOfferta}</div>
      </div>
    </div>
  );
}
