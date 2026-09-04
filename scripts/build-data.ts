/**
 * Pipeline dati: unisce listone 2026/27 + statistiche storiche (+ fpedia se presente)
 * e produce src/data/players.json e src/data/players.meta.json.
 *
 *   npm run data
 */
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { readSheet, findRaw, num, numOrNull, normName } from './lib.ts';
import { RUOLO_LABEL } from '../src/types.ts';
import type { Player, Ruolo, StagioneStats, FpediaData, PlayersMeta } from '../src/types.ts';

const OUT_DIR = join(process.cwd(), 'src', 'data');
const STAGIONE_CORRENTE = '2026-27';
// stagioni concluse usate per la fantamedia pesata, con peso (recenti = più peso)
const PESI_STORICO: Record<string, number> = { '2023-24': 0.2, '2024-25': 0.3, '2025-26': 0.5 };
const ULTIMA_CONCLUSA = '2025-26';

function ruoloFromR(r: string): Ruolo {
  const c = (r || '').trim().toUpperCase()[0];
  return (['P', 'D', 'C', 'A'].includes(c) ? c : 'C') as Ruolo;
}

// ---------- 1. Listone stagione corrente ----------
const listoneFiles = findRaw('Quotazioni_Fantacalcio_Stagione');
const listoneCorr = listoneFiles.find((f) => f.season === STAGIONE_CORRENTE);
if (!listoneCorr) throw new Error(`Manca il listone ${STAGIONE_CORRENTE} in raw/`);

const players = new Map<number, Player>();
for (const row of readSheet(listoneCorr.path, 'Tutti')) {
  const id = num(row['Id']);
  if (!id) continue;
  players.set(id, {
    id,
    nome: String(row['Nome'] ?? '').trim(),
    squadra: String(row['Squadra'] ?? '').trim(),
    ruolo: ruoloFromR(String(row['R'] ?? '')),
    ruoloMantra: String(row['RM'] ?? '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean),
    qtA: num(row['Qt.A']),
    qtI: num(row['Qt.I']),
    fvm: num(row['FVM']),
    storico: {},
    fpedia: {},
    flags: { rigorista: false, assistman: false, titolare: false, buonaMedia: false, goleador: false, fuoriclasse: false },
    flagPerche: {},
    fpediaTags: [],
    senzaStoricoSerieA: true,
    convenienza: null,
    prezzoConsigliato: 1,
    fmPesata: null,
    affidabilita: null,
    fonti: { qtA: 'listone', fvm: 'listone', ruolo: 'listone', squadra: 'listone' },
  });
}
console.log(`Listone ${STAGIONE_CORRENTE}: ${players.size} giocatori`);

// ---------- 2. Statistiche storiche ----------
const statsFiles = findRaw('Statistiche_Fantacalcio_Stagione');
const stagioni = statsFiles.map((f) => f.season);
for (const { path, season } of statsFiles) {
  let hit = 0;
  for (const row of readSheet(path, 'Tutti')) {
    const p = players.get(num(row['Id']));
    if (!p) continue;
    const s: StagioneStats = {
      pv: num(row['Pv']),
      mv: numOrNull(row['Mv']),
      fm: numOrNull(row['Fm']),
      golFatti: num(row['Gf']),
      golSubiti: num(row['Gs']),
      rigParati: num(row['Rp']),
      rigCalciati: num(row['Rc']),
      rigFatti: num(row['R+']),
      rigSbagliati: num(row['R-']),
      assist: num(row['Ass']),
      amm: num(row['Amm']),
      esp: num(row['Esp']),
      autogol: num(row['Au']),
    };
    p.storico[season] = s;
    hit++;
  }
  console.log(`Statistiche ${season}: ${hit} giocatori del listone`);
}

// ---------- 3. Fpedia (opzionale) ----------
let conFpedia = 0;
const fpediaCache = join(process.cwd(), 'scripts', '.cache', 'fpedia.json');
if (existsSync(fpediaCache)) {
  const raw = JSON.parse(readFileSync(fpediaCache, 'utf-8')) as FpediaRecord[];
  // indice per (nome normalizzato, squadra) e per cognome+squadra
  // fpedia elenca il cognome per primo (es. "RAMOS GONCALO"), come il listone ("Ramos G.")
  const byKey = new Map<string, FpediaRecord>();
  const byCognome = new Map<string, FpediaRecord[]>();
  for (const r of raw) {
    const nn = normName(r.nome);
    byKey.set(`${nn}|${normName(r.squadra)}`, r);
    byKey.set(`~${nn.split(' ')[0]}|${normName(r.squadra)}`, r); // cognome + squadra
    const cg = nn.split(' ')[0];
    (byCognome.get(cg) ?? byCognome.set(cg, []).get(cg)!).push(r);
  }
  for (const p of players.values()) {
    const nn = normName(p.nome).replace(/ [a-z]$/, '');
    const sq = normName(p.squadra);
    const cognome = normName(p.nome).replace(/\.$/, '').split(' ')[0];
    let rec = byKey.get(`${nn}|${sq}`) || byKey.get(`~${cognome}|${sq}`);
    if (!rec) {
      const cand = byCognome.get(cognome) ?? byCognome.get(nn.split(' ')[0]);
      if (cand && cand.length === 1) rec = cand[0];
    }
    if (!rec) {
      // overlap di token del nome (>=3 lettere), preferendo la stessa squadra
      const ptoks = new Set(normName(p.nome).split(' ').filter((t) => t.length >= 3));
      let best: FpediaRecord | undefined;
      let bestScore = 0;
      for (const r of raw) {
        const rt = normName(r.nome).split(' ');
        let ov = 0;
        for (const t of rt) if (ptoks.has(t)) ov++;
        if (ov === 0) continue;
        const score = ov + (normName(r.squadra) === sq ? 2 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = r;
        }
      }
      if (best && bestScore >= 3) rec = best; // almeno un token in comune + stessa squadra
    }
    if (!rec) continue;
    conFpedia++;
    const f: FpediaData = {
      punteggioAlgoritmo: rec.punteggioAlgoritmo,
      punteggioFcp: rec.punteggioFcp,
      soliditaInvestimento: rec.soliditaInvestimento,
      resistenzaInfortuni: rec.resistenzaInfortuni,
      presenzePreviste: rec.presenzePreviste,
      golPrevisti: rec.golPrevisti,
      assistPrevisti: rec.assistPrevisti,
      trend: rec.trend,
      consigli: rec.consigli,
      url: rec.url,
    };
    const rf = (rec.flags || {}) as Record<string, boolean>;
    f.panchinaro = !!rf.panchinaro;
    f.outsider = !!rf.outsider;
    p.fpedia = f;
    p.alias = rec.nome
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
    // tag EDITORIALI di fantacalciopedia: solo informativi, non toccano p.flags
    const TAGLBL: Record<string, string> = {
      rigorista: 'Rigorista',
      assistman: 'Assistman',
      titolare: 'Titolare',
      buonaMedia: 'Buona media',
      goleador: 'Goleador',
      fuoriclasse: 'Fuoriclasse',
      piazzati: 'Calci piazzati',
      panchinaro: 'Panchinaro',
      outsider: 'Outsider',
    };
    p.fpediaTags = Object.keys(rf)
      .filter((k) => rf[k] && TAGLBL[k])
      .map((k) => TAGLBL[k]);
  }
  console.log(`Fpedia: ${conFpedia}/${players.size} giocatori arricchiti`);
} else {
  console.log('Fpedia: cache assente (scripts/.cache/fpedia.json) — salto arricchimento');
}

// ---------- 4. Fantamedia pesata, affidabilità, flag (dalle statistiche ufficiali) ----------
const PENULTIMA = '2024-25';
const ST_LABEL = (k: string) => k.slice(2).replace('-', '/'); // "2025-26" -> "25/26"
const GOL_SOGLIA: Record<Ruolo, number> = { A: 10, C: 6, D: 3, P: 99 };

for (const p of players.values()) {
  // -- fantamedia storica pesata (stagioni con >=5 presenze) --
  let wSum = 0;
  let fmSum = 0;
  let pvSum = 0;
  let nSeasons = 0;
  for (const [season, peso] of Object.entries(PESI_STORICO)) {
    const s = p.storico[season];
    if (!s || s.pv < 5 || s.fm == null) continue;
    wSum += peso;
    fmSum += peso * s.fm;
    pvSum += s.pv;
    nSeasons++;
  }
  if (wSum > 0) {
    p.fmPesata = round2(fmSum / wSum);
    p.affidabilita = round2(Math.min(1, pvSum / nSeasons / 30));
    p.fonti.fmPesata = 'euristica';
  }

  const s1 = p.storico[ULTIMA_CONCLUSA]; // 2025-26
  const s2 = p.storico[PENULTIMA]; // 2024-25
  const utili = [s1, s2].filter((s): s is StagioneStats => !!s && s.pv >= 5);
  p.senzaStoricoSerieA = utili.length === 0;

  if (!p.senzaStoricoSerieA) {
    // --- flag calcolati dalle statistiche ---
    const rig = (s1?.rigCalciati ?? 0) + (s2?.rigCalciati ?? 0);
    if ((s1?.rigCalciati ?? 0) >= 3 || ((s1?.rigCalciati ?? 0) >= 2 && (s2?.rigCalciati ?? 0) >= 2)) {
      p.flags.rigorista = true;
      p.flagPerche.rigorista = `${rig} rigori calciati nelle ultime 2 stagioni`;
    }

    const presMedia = Math.round(utili.reduce((a, s) => a + s.pv, 0) / utili.length);
    if (presMedia >= 24) {
      p.flags.titolare = true;
      p.flagPerche.titolare = `media ${presMedia} presenze su 38 (ultime ${utili.length})`;
    }

    if (s1 && s1.pv >= 15) {
      if (p.ruolo !== 'P' && s1.golFatti >= GOL_SOGLIA[p.ruolo]) {
        p.flags.goleador = true;
        p.flagPerche.goleador = `${s1.golFatti} gol nel ${ST_LABEL(ULTIMA_CONCLUSA)}`;
      }
      const assMedia = utili.reduce((a, s) => a + s.assist, 0) / utili.length;
      if (s1.assist >= 5 || assMedia >= 4) {
        p.flags.assistman = true;
        p.flagPerche.assistman = `${s1.assist} assist nel ${ST_LABEL(ULTIMA_CONCLUSA)}`;
      }
      if (s1.mv != null && s1.mv >= 6.1) {
        p.flags.buonaMedia = true;
        p.flagPerche.buonaMedia = `media voto ${s1.mv.toFixed(2)} nel ${ST_LABEL(ULTIMA_CONCLUSA)}`;
      }
    }
  } else {
    // nessuno storico in A: usa i tag editoriali di fantacalciopedia come stima
    const has = (t: string) => p.fpediaTags.includes(t);
    if (has('Rigorista')) p.flags.rigorista = true;
    if (has('Titolare')) p.flags.titolare = true;
    if (has('Goleador')) p.flags.goleador = true;
    if (has('Assistman')) p.flags.assistman = true;
    if (has('Buona media')) p.flags.buonaMedia = true;
    for (const k of ['rigorista', 'titolare', 'goleador', 'assistman', 'buonaMedia'] as const) {
      if (p.flags[k]) p.flagPerche[k] = 'stima fantacalciopedia (nessuno storico in Serie A)';
    }
  }
}

// fuoriclasse: fantamedia pesata nel top ~10% del reparto
for (const ruolo of ['P', 'D', 'C', 'A'] as Ruolo[]) {
  const conFm = [...players.values()]
    .filter((p) => p.ruolo === ruolo && p.fmPesata != null)
    .sort((a, b) => b.fmPesata! - a.fmPesata!);
  const soglia = conFm[Math.max(0, Math.ceil(conFm.length * 0.1) - 1)]?.fmPesata ?? 99;
  for (const p of conFm) {
    if (p.fmPesata! >= soglia && p.affidabilita != null && p.affidabilita >= 0.6) {
      p.flags.fuoriclasse = true;
      p.flagPerche.fuoriclasse = `fantamedia storica ${p.fmPesata} — tra i migliori ${RUOLO_LABEL[ruolo].toLowerCase()}`;
    }
  }
}

// ---------- 5. Indice di convenienza (per reparto) ----------
// Idea: il prezzo di mercato (Qt.A) riflette già il valore atteso. La "convenienza" misura
// di quanto il RENDIMENTO STORICO del giocatore supera quello tipico dei giocatori alla
// sua stessa fascia di prezzo. Regressione fm ~ a + b·log(qtA) sui giocatori con storico,
// poi convenienza = 50 + k·(residuo normalizzato). Chi non ha storico Serie A -> null.
const rendimento = (p: Player): number | null => {
  if (p.fmPesata == null) return null;
  const affid = p.affidabilita ?? 0.5;
  // avvicina alla media di reparto chi ha poche presenze (poco affidabile)
  return p.fmPesata + (p.ruolo !== 'P' && p.flags.rigorista ? 0.15 : 0) - (1 - affid) * 0.3;
};

for (const ruolo of ['P', 'D', 'C', 'A'] as Ruolo[]) {
  const gruppo = [...players.values()].filter((p) => p.ruolo === ruolo);
  const campione = gruppo
    .map((p) => ({ p, r: rendimento(p), x: Math.log(Math.max(3, p.qtA)) }))
    .filter((o): o is { p: Player; r: number; x: number } => o.r != null && o.p.qtA >= 3);
  if (campione.length < 8) continue;
  const n = campione.length;
  const mx = campione.reduce((s, o) => s + o.x, 0) / n;
  const my = campione.reduce((s, o) => s + o.r, 0) / n;
  const b =
    campione.reduce((s, o) => s + (o.x - mx) * (o.r - my), 0) /
    (campione.reduce((s, o) => s + (o.x - mx) ** 2, 0) || 1);
  const a = my - b * mx;
  const resid = campione.map((o) => o.r - (a + b * o.x));
  const sdRes = Math.sqrt(resid.reduce((s, r) => s + r * r, 0) / n) || 1;
  for (const p of gruppo) {
    const r = rendimento(p);
    if (r == null) continue;
    const pred = a + b * Math.log(Math.max(3, p.qtA));
    p.convenienza = clamp(Math.round(50 + 18 * ((r - pred) / sdRes)), 5, 99);
    p.fonti.convenienza = 'euristica';
  }
}

// ---------- 6. Prezzo d'asta stimato + budget consigliato per reparto ----------
// Lega a 12 squadre, 500 crediti, rosa 3-8-8-6. Tutti i 6000 crediti vengono spesi
// su 300 slot; molti slot vanno a 1 credito. Ripartiamo il monte crediti per reparto
// e lo distribuiamo tra i primi (12 × slot) giocatori, proporzionale a (Qt.A-1) con
// una leggera concentrazione sui top e un ritocco per la forma recente (convenienza).
const N_SQUADRE = 12;
const BUDGET = 500;
const ROSA: Record<Ruolo, number> = { P: 3, D: 8, C: 8, A: 6 };
const SPLIT: Record<Ruolo, number> = { P: 0.07, D: 0.15, C: 0.3, A: 0.48 }; // quota del budget per reparto
const GAMMA = 1.12;

const strategia: PlayersMeta['strategia'] = {} as PlayersMeta['strategia'];
for (const ruolo of ['P', 'D', 'C', 'A'] as Ruolo[]) {
  const perTeam = Math.round(BUDGET * SPLIT[ruolo]);
  const pool = perTeam * N_SQUADRE;
  const nSlot = ROSA[ruolo] * N_SQUADRE;
  const gruppo = [...players.values()]
    .filter((p) => p.ruolo === ruolo && !p.ceduto)
    .sort((a, b) => b.qtA - a.qtA || b.fvm - a.fvm);
  const tier = gruppo.slice(0, nSlot);

  const formMult = (p: Player) =>
    p.convenienza == null ? 1 : 1 + 0.12 * clamp((p.convenienza - 50) / 25, -1, 1);
  const peso = (p: Player) => Math.pow(Math.max(0.5, p.qtA - 1), GAMMA) * formMult(p);

  let wSum = tier.reduce((s, p) => s + peso(p), 0);
  const distrib = pool - nSlot; // 1 credito riservato a ciascuno
  const cap = Math.round(Math.max(BUDGET * 0.3, perTeam * (ruolo === 'A' ? 0.6 : 0.8)));

  let extra = 0;
  for (const p of tier) {
    let prezzo = Math.round(1 + (distrib * peso(p)) / wSum);
    if (prezzo > cap) {
      extra += prezzo - cap;
      prezzo = cap;
    }
    p.prezzoConsigliato = prezzo;
  }
  // ridistribuisci l'eccedenza dei "cappati" sugli altri del tier
  if (extra > 0) {
    const resto = tier.filter((p) => p.prezzoConsigliato! < cap);
    const rSum = resto.reduce((s, p) => s + peso(p), 0) || 1;
    for (const p of resto) p.prezzoConsigliato = Math.round(p.prezzoConsigliato! + (extra * peso(p)) / rSum);
  }
  for (const p of gruppo.slice(nSlot)) p.prezzoConsigliato = 1;

  wSum = tier.reduce((s, p) => s + (p.prezzoConsigliato ?? 0), 0);
  strategia[ruolo] = {
    quotaPerSquadra: perTeam,
    poolLega: pool,
    slotLega: nSlot,
    spesaTop: Math.round(wSum / N_SQUADRE),
  };
}

// ---------- 7. Output ----------
mkdirSync(OUT_DIR, { recursive: true });
const list = [...players.values()].sort((a, b) => b.qtA - a.qtA || a.nome.localeCompare(b.nome));
writeFileSync(join(OUT_DIR, 'players.json'), JSON.stringify(list));
const meta: PlayersMeta = {
  generatoIl: new Date().toISOString(),
  stagioneCorrente: STAGIONE_CORRENTE,
  stagioni,
  numGiocatori: list.length,
  conFpedia,
  senzaStoricoRecente: list.filter((p) => !p.storico[ULTIMA_CONCLUSA]).map((p) => p.id),
  strategia,
};
writeFileSync(join(OUT_DIR, 'players.meta.json'), JSON.stringify(meta, null, 2));
console.log(
  `\nScritti ${list.length} giocatori in src/data/players.json` +
    `\n  con fantamedia storica: ${list.filter((p) => p.fmPesata != null).length}` +
    `\n  con convenienza: ${list.filter((p) => p.convenienza != null).length}` +
    `\n  rigoristi: ${list.filter((p) => p.flags.rigorista).length}` +
    `\n  senza storico ${ULTIMA_CONCLUSA}: ${meta.senzaStoricoRecente.length}`,
);

// ---------- utils ----------
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

interface FpediaRecord {
  nome: string;
  squadra: string;
  punteggioAlgoritmo?: number;
  punteggioFcp?: number;
  soliditaInvestimento?: number;
  resistenzaInfortuni?: number;
  presenzePreviste?: [number, number];
  golPrevisti?: [number, number];
  assistPrevisti?: [number, number];
  trend?: 'UP' | 'DOWN' | 'STABLE';
  consigli?: string;
  url?: string;
  flags?: Record<string, boolean>;
}
