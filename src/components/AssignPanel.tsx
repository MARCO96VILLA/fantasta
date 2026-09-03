import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store.ts';
import { allTeamStatus, teamStatus } from '../selectors.ts';

export function AssignPanel({ playerId, onDone }: { playerId: number; onDone?: () => void }) {
  const settings = useStore((s) => s.settings);
  const auction = useStore((s) => s.auction);
  const assign = useStore((s) => s.assign);
  const unassign = useStore((s) => s.unassign);
  const target = useStore((s) => s.userData[playerId]?.targetMax);
  const existing = auction.find((a) => a.playerId === playerId);

  const [prezzo, setPrezzo] = useState<string>(existing ? String(existing.prezzo) : '');
  const [teamId, setTeamId] = useState<string>(existing?.teamId ?? settings.myTeamId ?? settings.teams[0].id);
  const priceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPrezzo(existing ? String(existing.prezzo) : '');
    setTeamId(existing?.teamId ?? settings.myTeamId ?? settings.teams[0].id);
    priceRef.current?.focus();
  }, [playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Alt+1..0 : scegli la squadra da qualsiasi punto (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || !/^[0-9]$/.test(e.key)) return;
      const t = settings.teams[e.key === '0' ? 9 : Number(e.key) - 1];
      if (t) {
        setTeamId(t.id);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settings.teams]);

  const teams = useMemo(() => allTeamStatus(settings, auction), [settings, auction]);
  const price = Number(prezzo);
  const valid = teamId && Number.isFinite(price) && price >= 1;
  const ts = teamId ? teamStatus(settings, auction, teamId) : null;
  const overTarget = target != null && price > target;
  const rientroExisting = existing?.teamId === teamId ? existing.prezzo : 0;
  const overMax = ts != null && price > ts.maxOfferta + rientroExisting;

  function submit() {
    if (!valid) return;
    assign(playerId, teamId, price);
    onDone?.();
  }

  return (
    <div className="assignbar col" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 8 }}>
        <input
          ref={priceRef}
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="€"
          value={prezzo}
          onChange={(e) => setPrezzo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          style={{ width: 78, fontSize: 18, fontWeight: 700, textAlign: 'center' }}
        />
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={{ flex: 1 }}>
          {teams.map((t, i) => (
            <option key={t.id} value={t.id}>
              {(i + 1) % 10}. {t.nome}
              {t.isMine ? ' ★' : ''} — {t.residuo}€ (max {t.maxOfferta})
            </option>
          ))}
        </select>
        <button className="primary" disabled={!valid} onClick={submit} style={{ minWidth: 96 }}>
          {existing ? 'Aggiorna' : 'Assegna'}
        </button>
      </div>
      <div className="row wrap small" style={{ gap: 10, justifyContent: 'space-between' }}>
        <span>
          {(overTarget || overMax) && (
            <span style={{ color: 'var(--bad)', fontWeight: 600 }}>
              {overTarget && `Oltre il tuo max (${target}). `}
              {overMax && `Oltre l'offerta max di ${ts?.nome} (${ts?.maxOfferta}).`}
            </span>
          )}
        </span>
        {existing && (
          <button className="danger ghost small" onClick={() => { unassign(playerId); onDone?.(); }}>
            Rimuovi assegnazione
          </button>
        )}
      </div>
    </div>
  );
}
