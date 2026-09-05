import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store.ts';
import { allTeamStatus } from '../selectors.ts';
import { RUOLI, RUOLO_LABEL } from '../types.ts';
import type { Ruolo } from '../types.ts';
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

  // Tiene la barra squadre fissa appena sotto la topbar, misurandone l'altezza reale
  // (diversa tra mobile e desktop) invece di un valore fisso in px.
  const tabsRef = useRef<HTMLDivElement>(null);
  const [topOffset, setTopOffset] = useState(0);
  useLayoutEffect(() => {
    const el = document.querySelector('.topbar');
    if (!el) return;
    const update = () => setTopOffset(el.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // Quando si cambia squadra, resta scrollati sullo stesso reparto (es. Attaccanti)
  // invece di tornare in cima alla pagina.
  const roleRefs = useRef<Partial<Record<Ruolo, HTMLDivElement | null>>>({});
  const pendingAnchor = useRef<Ruolo | null>(null);

  function headerHeight() {
    return topOffset + (tabsRef.current?.getBoundingClientRect().height ?? 0);
  }

  function currentAnchor(): Ruolo | null {
    const h = headerHeight();
    for (const r of RUOLI) {
      const el = roleRefs.current[r];
      if (el && el.getBoundingClientRect().bottom > h + 4) return r;
    }
    return null;
  }

  function selectTeam(id: string) {
    pendingAnchor.current = currentAnchor();
    setTeamId(id);
  }

  useEffect(() => {
    const anchor = pendingAnchor.current;
    pendingAnchor.current = null;
    if (!anchor) return;
    // niente requestAnimationFrame: in webview/PWA può restare in sospeso se la
    // pagina non sta ridisegnando in quel preciso istante; un timeout scatta comunque.
    const t = setTimeout(() => {
      const el = roleRefs.current[anchor];
      if (!el) return;
      const y = window.scrollY + el.getBoundingClientRect().top - headerHeight() - 8;
      window.scrollTo({ top: Math.max(0, y) });
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  return (
    <div className="col" style={{ gap: 12 }}>
      <h1>Tabellone squadre</h1>

      <div className="team-tabs" ref={tabsRef} style={{ top: topOffset }}>
        {teams.map((tm) => (
          <button key={tm.id} className={tm.id === t?.id ? 'primary' : ''} onClick={() => selectTeam(tm.id)}>
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
              <div
                key={r}
                ref={(el) => {
                  roleRefs.current[r] = el;
                }}
                className="col"
                style={{ gap: 2 }}
              >
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
