import { useStore } from '../store.ts';
import { PLAYER_BY_ID } from '../data.ts';
import { effectivePlayer, takenIndex } from '../selectors.ts';
import { RUOLO_LABEL, FLAG_META } from '../types.ts';
import { fmt, convClass, range } from '../lib/format.ts';
import { PlayerBadges } from './PlayerBadges.tsx';
import { StoricoTable } from './StoricoTable.tsx';
import { TagChips, TargetInput, InteresseStars } from './TagPicker.tsx';

export function PlayerCard({ playerId }: { playerId: number }) {
  const base = PLAYER_BY_ID.get(playerId);
  const u = useStore((s) => s.userData[playerId]);
  const settings = useStore((s) => s.settings);
  const auction = useStore((s) => s.auction);
  const setNota = useStore((s) => s.setNota);
  const setOverride = useStore((s) => s.setOverride);
  if (!base) return <p>Giocatore non trovato.</p>;
  const p = effectivePlayer(base, u);
  const taken = takenIndex(settings, auction).get(playerId);
  const f = p.fpedia;

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="row">
            <span className={`role ${p.ruolo}`}>{p.ruolo}</span>
            <h2 style={{ fontSize: 20 }}>{p.alias ?? p.nome}</h2>
          </div>
          <div className="muted small">
            {p.alias && p.alias !== p.nome ? `${p.nome} · ` : ''}
            {p.squadra} · {RUOLO_LABEL[p.ruolo]}
            {p.ruoloMantra.length ? ` · Mantra: ${p.ruoloMantra.join(' / ')}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          {u?.targetMax != null ? (
            <>
              <div style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 34, lineHeight: 1 }}>
                {u.targetMax}
              </div>
              <div className="small" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                il tuo riferimento
              </div>
              <div className="muted small" style={{ marginTop: 3 }}>
                Qt.A {p.qtA} · consigl. {p.prezzoConsigliato} · FVM {p.fvm}
              </div>
            </>
          ) : (
            <>
              <div>
                <b style={{ fontSize: 24 }}>{p.qtA}</b> <span className="muted small">Qt.A</span>
              </div>
              <div className="muted small">
                consigl. {p.prezzoConsigliato} · Qt.I {p.qtI} · FVM {p.fvm}
              </div>
            </>
          )}
        </div>
      </div>

      {taken && (
        <div className="panel" style={{ background: 'var(--warn-bg)', borderColor: 'transparent', padding: 10 }}>
          Preso da <b>{taken.teamNome}</b> per <b>{taken.prezzo}</b>
          {u?.targetMax != null && (
            <span className="muted"> · tuo riferimento {u.targetMax}</span>
          )}
        </div>
      )}

      {p.senzaStoricoSerieA && (
        <div className="small muted">
          Nessuna stagione utile in Serie A: i tag qui sotto sono una <b>stima di fantacalciopedia</b>,
          non calcolati sui dati.
        </div>
      )}

      <div className="col" style={{ gap: 6 }}>
        <PlayerBadges player={p} />
        {(FLAG_META.some((f) => p.flags[f.key]) || p.fpediaTags.length > 0) && (
          <details>
            <summary className="small muted">perché questi tag?</summary>
            <div className="col small" style={{ gap: 3, marginTop: 6 }}>
              {FLAG_META.filter((f) => p.flags[f.key]).map((f) => (
                <span key={f.key}>
                  <b>{f.label}</b> — {p.flagPerche[f.key] ?? f.descr}
                </span>
              ))}
              {p.fpediaTags.length > 0 && (
                <span className="muted" style={{ marginTop: 4 }}>
                  Tag editoriali di fantacalciopedia (non calcolati): {p.fpediaTags.join(', ')}
                </span>
              )}
            </div>
          </details>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(112px,1fr))' }}>
        <Stat
          label="Prezzo consigliato"
          v={String(p.prezzoConsigliato)}
          title="Stima del prezzo d'asta in lega a 12 squadre / 500 crediti: ripartisce il monte crediti del reparto tra i migliori giocatori in base a Qt.A e forma recente. 1 = fuori dai titolari di reparto."
        />
        <Stat
          label="Convenienza"
          v={p.convenienza == null ? '–' : String(p.convenienza)}
          cls={convClass(p.convenienza)}
          title="0–100, per reparto. Quanto la fantamedia storica del giocatore supera quella tipica per il suo prezzo. 50 = in linea, >65 rende più di quanto costa. '–' = nessuno storico in Serie A."
        />
        <Stat
          label="FM pesata (3 st.)"
          v={fmt(p.fmPesata, 2)}
          title="Fantamedia delle ultime 3 stagioni concluse, media pesata (25/26 ×0.5, 24/25 ×0.3, 23/24 ×0.2), solo stagioni con ≥5 presenze. È il rendimento storico del giocatore."
        />
        <Stat
          label="Punteggio FCP"
          v={f.punteggioAlgoritmo != null ? `${f.punteggioAlgoritmo}/100` : '–'}
          title="Punteggio 0–100 dell'algoritmo di fantacalciopedia: la loro sintesi di quanto vale il giocatore per l'asta. Non calcolato da noi."
        />
        <Stat
          label="Solidità inv."
          v={f.soliditaInvestimento != null ? `${f.soliditaInvestimento}%` : '–'}
          title="Solidità dell'investimento (fantacalciopedia): quanto è 'sicuro' puntarci — rischio panchina/bocciatura. Dato loro."
        />
        <Stat
          label="Res. infortuni"
          v={f.resistenzaInfortuni != null ? `${f.resistenzaInfortuni}%` : '–'}
          title="Resistenza agli infortuni (fantacalciopedia): storico di tenuta fisica. Dato loro."
        />
      </div>

      {(f.presenzePreviste || f.golPrevisti || f.assistPrevisti) && (
        <div className="small muted">
          Previsione {p.fpedia.trend ? `(trend ${p.fpedia.trend}) ` : ''}·{' '}
          Presenze {range(f.presenzePreviste)}
          {p.ruolo !== 'P' && (
            <>
              {' '}
              · Gol {range(f.golPrevisti)} · Assist {range(f.assistPrevisti)}
            </>
          )}
        </div>
      )}

      <div>
        <h3>Storico</h3>
        <StoricoTable player={p} />
      </div>

      {f.consigli && (
        <div>
          <h3>Consiglio asta (fantacalciopedia)</h3>
          <p className="small">{f.consigli}</p>
        </div>
      )}

      <div className="panel col" style={{ gap: 10, background: 'var(--panel-2)' }}>
        <h3>I miei appunti</h3>
        <TagChips playerId={playerId} />
        <div className="row wrap" style={{ gap: 14 }}>
          <label className="row small">
            Prezzo di riferimento <TargetInput playerId={playerId} />
          </label>
          <label className="row small">
            Interesse <InteresseStars playerId={playerId} />
          </label>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Il prezzo di riferimento è solo un promemoria/benchmark: in asta puoi comunque
          assegnare qualsiasi cifra, viene solo evidenziato se lo superi.
        </p>
        <textarea
          rows={2}
          placeholder="Nota…"
          value={u?.nota ?? ''}
          onChange={(e) => setNota(playerId, e.target.value)}
        />
      </div>

      <details>
        <summary className="small muted">Correggi dati manualmente</summary>
        <div className="col small" style={{ gap: 8, marginTop: 8 }}>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            {FLAG_META.map((fm) => (
              <label key={fm.key} className="row" style={{ gap: 4 }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={!!p.flags[fm.key]}
                  onChange={(e) =>
                    setOverride(playerId, { flags: { ...u?.overrides?.flags, [fm.key]: e.target.checked } })
                  }
                />
                {fm.label}
              </label>
            ))}
          </div>
          <label className="row" style={{ gap: 6 }}>
            Qt.A
            <input
              type="number"
              style={{ width: 80 }}
              value={p.qtA}
              onChange={(e) => setOverride(playerId, { qtA: Number(e.target.value) })}
            />
          </label>
          <span className="muted">Fonte campi: {Object.entries(base.fonti).map(([k, v]) => `${k}=${v}`).join('  ')}</span>
        </div>
      </details>
    </div>
  );
}

function Stat({ label, v, cls, title }: { label: string; v: string; cls?: string; title?: string }) {
  return (
    <div className="panel" style={{ padding: 8 }} title={title}>
      <div className="small muted">
        {label} {title ? <span style={{ opacity: 0.6 }}>ⓘ</span> : null}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>
        {cls ? <span className={`conv ${cls}`}>{v}</span> : v}
      </div>
    </div>
  );
}
