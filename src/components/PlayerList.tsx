import { useMemo, useState } from 'react';
import { useStore } from '../store.ts';
import { PLAYERS, SQUADRE } from '../data.ts';
import { RUOLI, RUOLO_LABEL, FLAG_META } from '../types.ts';
import type { Player, Ruolo } from '../types.ts';
import { effectivePlayer, takenIndex } from '../selectors.ts';
import { fmt, convClass } from '../lib/format.ts';
import { TagChips, TargetInput, InteresseStars } from './TagPicker.tsx';

type SortKey = 'qtA' | 'prezzoConsigliato' | 'fvm' | 'fmPesata' | 'convenienza' | 'nome';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'qtA', label: 'Quotazione' },
  { key: 'prezzoConsigliato', label: 'Prezzo consigl.' },
  { key: 'convenienza', label: 'Convenienza' },
  { key: 'fmPesata', label: 'FM storica' },
  { key: 'fvm', label: 'FVM' },
  { key: 'nome', label: 'Nome' },
];

/** Elenco giocatori filtrabile/ordinabile, riusato in Preparazione e in Asta. */
export function PlayerList({
  onPick,
  showNameFilter = true,
}: {
  onPick: (id: number) => void;
  showNameFilter?: boolean;
}) {
  const userData = useStore((s) => s.userData);
  const settings = useStore((s) => s.settings);
  const auction = useStore((s) => s.auction);
  const tagDefs = useStore((s) => s.tagDefs);

  const [ruolo, setRuolo] = useState<Ruolo | ''>('');
  const [squadra, setSquadra] = useState('');
  const [tag, setTag] = useState('');
  const [flag, setFlag] = useState('');
  const [q, setQ] = useState('');
  const [hideTaken, setHideTaken] = useState(true);
  const [soloObiettivi, setSoloObiettivi] = useState(false);
  const [sort, setSort] = useState<SortKey>('qtA');
  const [asc, setAsc] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const tagLabel = tagDefs.find((t) => t.id === tag)?.label;
  const flagLabel = FLAG_META.find((f) => f.key === flag)?.label;
  const activeFilters: { label: string; clear: () => void }[] = [
    ...(showNameFilter && q.trim() ? [{ label: `"${q.trim()}"`, clear: () => setQ('') }] : []),
    ...(ruolo ? [{ label: RUOLO_LABEL[ruolo], clear: () => setRuolo('') }] : []),
    ...(squadra ? [{ label: squadra, clear: () => setSquadra('') }] : []),
    ...(tag && tagLabel ? [{ label: tagLabel, clear: () => setTag('') }] : []),
    ...(flag && flagLabel ? [{ label: flagLabel, clear: () => setFlag('') }] : []),
  ];

  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="panel col" style={{ gap: 8 }}>
        <button
          className="ghost small"
          style={{ alignSelf: 'flex-start', padding: '4px 2px' }}
          onClick={() => setFiltersOpen((o) => !o)}
        >
          {filtersOpen ? '▾' : '▸'} Filtri{activeFilters.length ? ` (${activeFilters.length})` : ''}
        </button>

        {!filtersOpen && activeFilters.length > 0 && (
          <div className="row wrap small" style={{ gap: 6 }}>
            {activeFilters.map((f, i) => (
              <button key={i} className="chip off" onClick={f.clear} title="Rimuovi filtro">
                {f.label} ✕
              </button>
            ))}
          </div>
        )}

        {filtersOpen && (
          <div className="col" style={{ gap: 8 }}>
            {showNameFilter && (
              <input
                type="search"
                placeholder="Filtra per nome…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            )}
            <div className="filter-grid">
              <select value={ruolo} onChange={(e) => setRuolo(e.target.value as Ruolo | '')}>
                <option value="">Ruolo</option>
                {RUOLI.map((r) => (
                  <option key={r} value={r}>
                    {RUOLO_LABEL[r]}
                  </option>
                ))}
              </select>
              <select value={squadra} onChange={(e) => setSquadra(e.target.value)}>
                <option value="">Squadra</option>
                {SQUADRE.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select value={tag} onChange={(e) => setTag(e.target.value)}>
                <option value="">Tag</option>
                {tagDefs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <select value={flag} onChange={(e) => setFlag(e.target.value)}>
                <option value="">Caratteristica</option>
                {FLAG_META.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

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

      <p className="small muted" style={{ margin: 0 }}>
        {rows.length} giocatori
      </p>
      <div className="plist-head">
        <span />
        <span>Giocatore</span>
        <span title="Quotazione">Qt</span>
        <span title="Prezzo consigliato">Cons</span>
        <span title="Fantamedia storica">FM</span>
        <span title="Convenienza">Conv</span>
        <span>Squadra</span>
        <span>Caratteristiche</span>
        <span>Rif. / Interesse</span>
      </div>
      <div className="plist">
        {rows.slice(0, 400).map((p) => (
          <PRow key={p.id} p={p} taken={taken.has(p.id)} onOpen={() => onPick(p.id)} />
        ))}
        {rows.length > 400 && <p className="muted small">…e altri {rows.length - 400}. Restringi i filtri.</p>}
      </div>
    </div>
  );
}

function PRow({ p, taken, onOpen }: { p: Player; taken: boolean; onOpen: () => void }) {
  return (
    <div className={`prow${taken ? ' taken' : ''}`}>
      <span className={`role ${p.ruolo}`}>{p.ruolo}</span>
      <span className="pname" onClick={onOpen} style={{ cursor: 'pointer' }}>
        {p.alias ?? p.nome}
      </span>
      <span className="pnum qta" title="Quotazione attuale (fantacalcio.it)">
        {p.qtA}
      </span>
      <span
        className="pnum cons"
        style={{ color: 'var(--accent)', fontWeight: 700 }}
        title="Prezzo d'asta consigliato (lega 12/500)"
      >
        {p.prezzoConsigliato}
      </span>
      <span className="pnum fm muted" title="Fantamedia storica pesata (3 stagioni)">
        {fmt(p.fmPesata, 1)}
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
          <span
            key={f.key}
            className={`badge ${f.cls}`}
            title={p.flagPerche[f.key] ? `${f.label}: ${p.flagPerche[f.key]}` : f.descr}
          >
            {f.label.split(' ')[0]}
            {p.senzaStoricoSerieA && p.flagPerche[f.key]?.startsWith('stima') ? '~' : ''}
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
