import { useMemo, useState } from 'react';
import { useStore } from '../store.ts';
import { PLAYERS, SQUADRE } from '../data.ts';
import { RUOLI, RUOLO_LABEL, FLAG_META } from '../types.ts';
import type { Player, Ruolo } from '../types.ts';
import { effectivePlayer, takenIndex } from '../selectors.ts';
import { fmt, convClass } from '../lib/format.ts';
import { usePlayerModal } from '../components/PlayerModal.tsx';
import { TagChips, TargetInput, InteresseStars } from '../components/TagPicker.tsx';

type SortKey = 'qtA' | 'fvm' | 'fmPesata' | 'convenienza' | 'nome';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'qtA', label: 'Quotazione' },
  { key: 'fvm', label: 'FVM' },
  { key: 'fmPesata', label: 'FM storica' },
  { key: 'convenienza', label: 'Convenienza' },
  { key: 'nome', label: 'Nome' },
];

export function Preparazione() {
  const userData = useStore((s) => s.userData);
  const settings = useStore((s) => s.settings);
  const auction = useStore((s) => s.auction);
  const tagDefs = useStore((s) => s.tagDefs);
  const open = usePlayerModal((s) => s.open);

  const [ruolo, setRuolo] = useState<Ruolo | ''>('');
  const [squadra, setSquadra] = useState('');
  const [tag, setTag] = useState('');
  const [flag, setFlag] = useState('');
  const [q, setQ] = useState('');
  const [hideTaken, setHideTaken] = useState(true);
  const [soloObiettivi, setSoloObiettivi] = useState(false);
  const [sort, setSort] = useState<SortKey>('qtA');
  const [asc, setAsc] = useState(false);

  const taken = useMemo(() => takenIndex(settings, auction), [settings, auction]);

  const rows = useMemo(() => {
    let list = PLAYERS.map((p) => effectivePlayer(p, userData[p.id]));
    if (ruolo) list = list.filter((p) => p.ruolo === ruolo);
    if (squadra) list = list.filter((p) => p.squadra === squadra);
    if (tag) list = list.filter((p) => userData[p.id]?.tags.includes(tag));
    if (flag) list = list.filter((p) => p.flags[flag as keyof typeof p.flags]);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter((p) => p.nome.toLowerCase().includes(t) || p.alias?.toLowerCase().includes(t));
    }
    if (hideTaken) list = list.filter((p) => !taken.has(p.id));
    if (soloObiettivi)
      list = list.filter((p) => {
        const u = userData[p.id];
        return u && (u.tags.includes('interessa') || (u.interesse ?? 0) >= 4 || u.targetMax != null);
      });
    const dir = asc ? 1 : -1;
    list.sort((a, b) => {
      if (sort === 'nome') return a.nome.localeCompare(b.nome) * dir;
      const av = (a[sort] ?? -1) as number;
      const bv = (b[sort] ?? -1) as number;
      return (av - bv) * dir;
    });
    return list;
  }, [userData, ruolo, squadra, tag, flag, q, hideTaken, soloObiettivi, sort, asc, taken]);

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        <h1>Preparazione · {rows.length}</h1>
        <BudgetPerReparto />
      </div>

      <div className="panel col" style={{ gap: 8 }}>
        <div className="row wrap" style={{ gap: 8 }}>
          <input
            type="search"
            placeholder="Cerca nome…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: '1 1 140px' }}
          />
          <select value={ruolo} onChange={(e) => setRuolo(e.target.value as Ruolo | '')} style={{ flex: '0 1 auto', width: 'auto' }}>
            <option value="">Ruolo</option>
            {RUOLI.map((r) => (
              <option key={r} value={r}>
                {RUOLO_LABEL[r]}
              </option>
            ))}
          </select>
          <select value={squadra} onChange={(e) => setSquadra(e.target.value)} style={{ flex: '0 1 auto', width: 'auto' }}>
            <option value="">Squadra</option>
            {SQUADRE.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select value={tag} onChange={(e) => setTag(e.target.value)} style={{ flex: '0 1 auto', width: 'auto' }}>
            <option value="">Tag</option>
            {tagDefs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <select value={flag} onChange={(e) => setFlag(e.target.value)} style={{ flex: '0 1 auto', width: 'auto' }}>
            <option value="">Caratteristica</option>
            {FLAG_META.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="row wrap" style={{ gap: 12, justifyContent: 'space-between' }}>
          <div className="sortbar">
            {SORTS.map((s) => (
              <button
                key={s.key}
                className={sort === s.key ? 'on' : ''}
                onClick={() => (sort === s.key ? setAsc(!asc) : (setSort(s.key), setAsc(s.key === 'nome')))}
              >
                {s.label} {sort === s.key ? (asc ? '▲' : '▼') : ''}
              </button>
            ))}
          </div>
          <div className="row wrap small" style={{ gap: 12 }}>
            <label className="row" style={{ gap: 5 }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={hideTaken} onChange={(e) => setHideTaken(e.target.checked)} />
              Nascondi presi
            </label>
            <label className="row" style={{ gap: 5 }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={soloObiettivi} onChange={(e) => setSoloObiettivi(e.target.checked)} />
              Solo obiettivi
            </label>
          </div>
        </div>
      </div>

      <div className="plist">
        {rows.slice(0, 400).map((p) => (
          <PRow key={p.id} p={p} onOpen={() => open(p.id, false)} />
        ))}
        {rows.length > 400 && <p className="muted small">…e altri {rows.length - 400}. Restringi i filtri.</p>}
      </div>
    </div>
  );
}

function PRow({ p, onOpen }: { p: Player; onOpen: () => void }) {
  return (
    <div className="prow">
      <span className={`role ${p.ruolo}`}>{p.ruolo}</span>
      <span className="pname" onClick={onOpen} style={{ cursor: 'pointer' }}>
        {p.alias ?? p.nome}
      </span>
      <span className="pnum qta" title="Quotazione attuale">
        {p.qtA}
      </span>
      <span className="pnum fvm muted" title="Fanta valore di mercato">
        {p.fvm}
      </span>
      <span className="pnum fm muted" title="Fantamedia storica pesata">
        {fmt(p.fmPesata, 2)}
      </span>
      <span className="pconv">
        {p.convenienza == null ? (
          <span className="muted small">–</span>
        ) : (
          <span className={`conv ${convClass(p.convenienza)}`}>{p.convenienza}</span>
        )}
      </span>
      <span className="psq muted small">{p.squadra}</span>
      <span className="pflags">
        {FLAG_META.filter((f) => p.flags[f.key]).map((f) => (
          <span key={f.key} className={`badge ${f.cls}`}>
            {f.label.split(' ')[0]}
          </span>
        ))}
      </span>
      <span className="ptools">
        <TargetInput playerId={p.id} />
        <InteresseStars playerId={p.id} />
      </span>
      <span className="ptags">
        <TagChips playerId={p.id} />
      </span>
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
