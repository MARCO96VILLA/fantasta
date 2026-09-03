import { useRef, useState } from 'react';
import { useStore } from '../store.ts';
import { RUOLI, RUOLO_LABEL } from '../types.ts';
import { META } from '../data.ts';
import { exportBackup, importBackup } from '../lib/backup.ts';

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
        <h2>Backup e dati</h2>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button onClick={exportBackup}>Esporta backup (JSON)</button>
          <button onClick={() => fileRef.current?.click()}>Importa backup</button>
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
              if (confirm('Azzerare tutte le assegnazioni d\'asta?')) resetAuction();
            }}
          >
            Azzera asta
          </button>
        </div>
        {msg && <p className="small">{msg}</p>}
        <p className="small muted">
          Catalogo: {META.numGiocatori} giocatori · stagione {META.stagioneCorrente} · dati generati il{' '}
          {new Date(META.generatoIl).toLocaleString('it-IT')} · {META.conFpedia} con dati fantacalciopedia.
          <br />
          Per aggiornare il listone: <code>npm run scrape</code> poi <code>npm run data</code>.
        </p>
      </section>
    </div>
  );
}
