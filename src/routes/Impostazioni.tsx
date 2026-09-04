import { useRef, useState } from 'react';
import { useStore } from '../store.ts';
import { RUOLI, RUOLO_LABEL } from '../types.ts';
import { META } from '../data.ts';
import { exportBackup, importBackup, copyBackupToClipboard, importBackupText } from '../lib/backup.ts';
import { FLAG_META } from '../types.ts';

export function Impostazioni() {
  const settings = useStore((s) => s.settings);
  const { renameTeam, setMyTeam, setBudget, setRoster, setTetto } = useStore.getState();
  const tagDefs = useStore((s) => s.tagDefs);
  const { addTag, updateTag, removeTag, resetAuction } = useStore.getState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [newTag, setNewTag] = useState('');

  return (
    <div className="col" style={{ gap: 16, maxWidth: 900 }}>
      <h1>Impostazioni lega</h1>

      <section className="panel col">
        <h2>Le 12 squadre</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
          {settings.teams.map((t) => (
            <label key={t.id} className="row">
              <input
                type="radio"
                name="myteam"
                style={{ width: 'auto' }}
                checked={settings.myTeamId === t.id}
                onChange={() => setMyTeam(t.id)}
                title="La mia squadra"
              />
              <input value={t.nome} onChange={(e) => renameTeam(t.id, e.target.value)} />
            </label>
          ))}
        </div>
        <p className="small muted">Il pallino seleziona la tua squadra (★ nell'asta).</p>
      </section>

      <section className="panel col">
        <h2>Crediti e rosa</h2>
        <label className="row">
          Budget per squadra
          <input
            type="number"
            style={{ width: 100 }}
            value={settings.budget}
            onChange={(e) => setBudget(Number(e.target.value))}
          />
        </label>
        <div className="row" style={{ flexWrap: 'wrap', gap: 16 }}>
          {RUOLI.map((r) => (
            <label key={r} className="row">
              {RUOLO_LABEL[r]}
              <input
                type="number"
                style={{ width: 60 }}
                value={settings.roster[r]}
                onChange={(e) => setRoster({ ...settings.roster, [r]: Number(e.target.value) })}
              />
            </label>
          ))}
          <span className="muted small">
            Totale {RUOLI.reduce((n, r) => n + settings.roster[r], 0)} giocatori
          </span>
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 16 }}>
          <span className="small muted">Tetto di spesa per reparto (opzionale):</span>
          {RUOLI.map((r) => (
            <label key={r} className="row small">
              {r}
              <input
                type="number"
                style={{ width: 70 }}
                placeholder="–"
                value={settings.tettiReparto[r] ?? ''}
                onChange={(e) => setTetto(r, e.target.value === '' ? undefined : Number(e.target.value))}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="panel col">
        <h2>Tag personalizzati</h2>
        {tagDefs.map((t) => (
          <div key={t.id} className="row">
            <input
              type="color"
              style={{ width: 40, padding: 2 }}
              value={t.color}
              onChange={(e) => updateTag(t.id, { color: e.target.value })}
            />
            <input value={t.label} onChange={(e) => updateTag(t.id, { label: e.target.value })} />
            <button className="danger ghost" onClick={() => removeTag(t.id)}>
              elimina
            </button>
          </div>
        ))}
        <div className="row">
          <input
            placeholder="Nuovo tag…"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTag.trim()) {
                addTag(newTag.trim(), '#6d28d9');
                setNewTag('');
              }
            }}
          />
          <button
            onClick={() => {
              if (newTag.trim()) {
                addTag(newTag.trim(), '#6d28d9');
                setNewTag('');
              }
            }}
          >
            Aggiungi
          </button>
        </div>
      </section>

      <section className="panel col">
        <h2>Backup e sincronizzazione</h2>
        <p className="small muted" style={{ margin: 0 }}>
          I tuoi dati (tag, prezzi di riferimento, acquisti) stanno <b>solo in questo
          dispositivo/browser</b>: non si sincronizzano da soli tra PC e telefono, e
          il push su GitHub aggiorna solo l'app, non i tuoi dati. Per spostarli usa
          Esporta/Importa qui sotto.
        </p>
        <div className="row wrap">
          <button onClick={exportBackup}>⬇ Esporta file JSON</button>
          <button onClick={() => fileRef.current?.click()}>⬆ Importa da file</button>
          <button
            onClick={async () => {
              try {
                await copyBackupToClipboard();
                setMsg('Backup copiato negli appunti — incollalo sull\'altro dispositivo.');
              } catch {
                setMsg('Copia non riuscita, usa il file JSON.');
              }
            }}
          >
            📋 Copia negli appunti
          </button>
          <button
            onClick={() => {
              const t = prompt('Incolla qui il backup copiato dall\'altro dispositivo:');
              if (!t) return;
              try {
                importBackupText(t);
                setMsg('Backup importato.');
              } catch (err) {
                setMsg('Errore: ' + (err as Error).message);
              }
            }}
          >
            📥 Incolla backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                await importBackup(f);
                setMsg('Backup importato.');
              } catch (err) {
                setMsg('Errore: ' + (err as Error).message);
              }
              e.target.value = '';
            }}
          />
          <button
            className="danger"
            onClick={() => {
              if (confirm("Azzerare tutte le assegnazioni d'asta?")) resetAuction();
            }}
          >
            Azzera asta
          </button>
        </div>
        {msg && <p className="small">{msg}</p>}
        <p className="small muted">
          Catalogo: {META.numGiocatori} giocatori · stagione {META.stagioneCorrente} · dati generati il{' '}
          {new Date(META.generatoIl).toLocaleString('it-IT')} · {META.conFpedia} con dati fantacalciopedia.
        </p>
      </section>

      <section className="panel col">
        <h2>Budget consigliato per reparto</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Lega a 12 squadre, 500 crediti, rosa 3-8-8-6. Ripartizione di riferimento del budget
          (modificabile: sono i "tetti per reparto" più sopra).
        </p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Reparto</th>
                <th className="num">Crediti / squadra</th>
                <th className="num">% budget</th>
                <th className="num">Spesa sui titolari*</th>
              </tr>
            </thead>
            <tbody>
              {RUOLI.map((r) => {
                const s = META.strategia[r];
                return (
                  <tr key={r}>
                    <td>
                      <span className={`role ${r}`}>{r}</span> {RUOLO_LABEL[r]}
                    </td>
                    <td className="num">{s.quotaPerSquadra}</td>
                    <td className="num">{Math.round((s.quotaPerSquadra / settings.budget) * 100)}%</td>
                    <td className="num">{s.spesaTop}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          * quanto spenderesti sui tuoi titolari di reparto seguendo il "prezzo consigliato"
          di ogni giocatore; il resto (fino a 25 slot) va a 1–2 crediti.
        </p>
        <button
          onClick={() => {
            RUOLI.forEach((r) => setTetto(r, META.strategia[r].quotaPerSquadra));
            setMsg('Tetti per reparto impostati sui valori consigliati.');
          }}
        >
          Usa come tetti per reparto
        </button>
      </section>

      <section className="panel col">
        <h2>Come funziona</h2>
        <details>
          <summary>
            <b>Prezzo consigliato</b> (per giocatore)
          </summary>
          <p className="small">
            Stima di quanto verrà pagato all'asta in una lega 12 squadre / 500 crediti.
            Metodo: fisso il monte crediti del reparto (12 × quota qui sopra), individuo i
            titolari del reparto (i 12 × slot giocatori con Qt.A più alta) e distribuisco il
            monte tra loro <b>proporzionalmente a (Qt.A − 1)</b>, con una leggera
            concentrazione sui top e un ritocco ±12% per la forma recente (convenienza).
            Chi resta fuori vale ~1. Non è un prezzo da pagare per forza: è il valore di
            mercato atteso, da confrontare col tuo <b>prezzo di riferimento</b>.
          </p>
        </details>
        <details>
          <summary>
            <b>Convenienza</b> (0–100)
          </summary>
          <p className="small">
            Per ogni reparto stimo la fantamedia tipica in funzione del prezzo
            (<code>fm ≈ a + b·log(Qt.A)</code>) usando i giocatori con storico in Serie A.
            La convenienza misura di quanto la <b>fantamedia storica pesata</b> del
            giocatore sta <b>sopra</b> quella attesa per il suo prezzo. 50 ≈ in linea col
            prezzo, &gt;65 rende più di quanto costa, &lt;35 il contrario. Chi non ha
            storico in Serie A non ha un valore ("–").
          </p>
        </details>
        <details>
          <summary>
            <b>FM pesata</b>, <b>Punteggio FCP</b>, <b>Solidità</b>, <b>Res. infortuni</b>
          </summary>
          <div className="small col" style={{ gap: 4 }}>
            <p style={{ margin: 0 }}>
              <b>FM pesata (3 st.)</b> — fantamedia delle ultime 3 stagioni concluse, media
              pesata (25/26 ×0.5, 24/25 ×0.3, 23/24 ×0.2), solo stagioni con ≥5 presenze,
              con penalità per le poche presenze. È il rendimento storico.
            </p>
            <p style={{ margin: 0 }}>
              <b>Punteggio FCP</b> — punteggio 0–100 dell'algoritmo di fantacalciopedia
              (loro giudizio complessivo). Preso da loro, non calcolato.
            </p>
            <p style={{ margin: 0 }}>
              <b>Solidità inv.</b> — quanto è "sicuro" l'investimento (rischio panchina /
              bocciatura), % di fantacalciopedia.
            </p>
            <p style={{ margin: 0 }}>
              <b>Res. infortuni</b> — storico di tenuta fisica, % di fantacalciopedia.
            </p>
          </div>
        </details>
        <details>
          <summary>
            <b>Tag caratteristiche</b>
          </summary>
          <div className="small col" style={{ gap: 4 }}>
            <p style={{ margin: 0 }}>
              Calcolati dalle statistiche ufficiali fantacalcio.it (ultime 2 stagioni concluse).
              Se un giocatore non ha stagioni utili in Serie A, si usa la stima editoriale
              di fantacalciopedia (badge con "~").
            </p>
            {FLAG_META.map((f) => (
              <p key={f.key} style={{ margin: 0 }}>
                <b>{f.label}</b> — {f.descr}
              </p>
            ))}
          </div>
        </details>
        <details>
          <summary>
            <b>Prezzo di riferimento</b>
          </summary>
          <p className="small">
            È solo un tuo promemoria per l'asta, <b>non un limite</b>. Quando assegni un
            prezzo più alto viene solo evidenziato in arancione. Serve come benchmark
            quando il giocatore viene chiamato.
          </p>
        </details>
      </section>
    </div>
  );
}
