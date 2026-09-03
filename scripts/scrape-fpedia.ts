/**
 * Scarica da fantacalciopedia.com le schede dei giocatori (skill tag, proiezioni,
 * punteggi) e le salva in scripts/.cache/fpedia.json.
 * Rate-limited e con cache HTML su disco: rilanciabile in modo incrementale.
 *
 *   npm run scrape
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';

const CACHE = join(process.cwd(), 'scripts', '.cache');
const HTML = join(CACHE, 'html');
mkdirSync(HTML, { recursive: true });

const BASE = 'https://www.fantacalciopedia.com';
const RUOLI = ['portieri', 'difensori', 'centrocampisti', 'trequartisti', 'attaccanti'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const DELAY = () => 600 + Math.random() * 900;
const CONC = 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, cacheKey?: string): Promise<string> {
  const file = cacheKey ? join(HTML, cacheKey) : null;
  if (file && existsSync(file)) return readFileSync(file, 'utf-8');
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const html = await res.text();
  if (file) writeFileSync(file, html);
  await sleep(DELAY());
  return html;
}

function parseRange(s: string | undefined): [number, number] | undefined {
  if (!s) return undefined;
  const t = s.trim();
  let m = t.match(/(\d+)\s*\/\s*(\d+)/);
  if (m) return [+m[1], +m[2]];
  m = t.match(/(\d+)\s*\+/);
  if (m) return [+m[1], Math.round(+m[1] * 1.25)];
  m = t.match(/(\d+)/);
  if (m) return [+m[1], +m[1]];
  return undefined;
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
  url: string;
  flags: Record<string, boolean>;
}

// mappa nome-icona fpedia -> chiave flag
const ICON_MAP: Record<string, string> = {
  titolare: 'titolare',
  media_voto: 'buonaMedia',
  goleador: 'goleador',
  assist: 'assistman',
  rigori: 'rigorista',
  fuoriclasse: 'fuoriclasse',
  calci_piazzati: 'piazzati',
  panchinaro: 'panchinaro',
  outsider: 'outsider',
};

function parsePlayer(html: string, url: string): FpediaRecord | null {
  const $ = cheerio.load(html);
  const nome = $('h1').first().text().trim();
  if (!nome) return null;
  const text = $('#content').text().replace(/\s+/g, ' ');

  const rec: FpediaRecord = { nome, squadra: '', url, flags: {} };

  const club = text.match(/Club:\s*([A-Za-zÀ-ÿ'’ .-]+?)\s+(?:Presenze|Nazionalit|Data)/i);
  if (club) rec.squadra = club[1].trim();

  const alg = $('span.stickdan').first().text().match(/(\d+)\s*\/\s*100/);
  if (alg) rec.punteggioAlgoritmo = +alg[1];
  const fcp = text.match(/Punteggio FCP[:\s]*([0-9]{1,3})/i) || text.match(/Punteggio FantaCalcioPedia\s*([0-9]{1,3})/i);
  if (fcp) rec.punteggioFcp = +fcp[1];

  const sol = text.match(/Solidit[àa][^:]*:\s*(\d)\s*su\s*5/i);
  if (sol) rec.soliditaInvestimento = +sol[1] * 20;
  const res = text.match(/Resistenza[^:]*:\s*(\d)\s*su\s*5/i);
  if (res) rec.resistenzaInfortuni = +res[1] * 20;

  const R = /(\d+\s*[/+]?\s*\d*)/;
  rec.presenzePreviste = parseRange(text.match(new RegExp('Presenze previste:\\s*' + R.source, 'i'))?.[1]);
  rec.golPrevisti = parseRange(text.match(new RegExp('Gol previsti:\\s*' + R.source, 'i'))?.[1]);
  rec.assistPrevisti = parseRange(text.match(new RegExp('Assist previsti:\\s*' + R.source, 'i'))?.[1]);

  // sezione "Caratteristiche fantacalcistiche suggerite": contiene solo le icone del giocatore
  const carat = text; // fallback
  const mSeg = html.match(
    /Caratteristiche fantacalcistiche suggerite([\s\S]*?)(?:<\/section>|Altri giocatori|Fantacalciopedia \|\|)/i,
  );
  const seg = mSeg ? mSeg[1] : carat;
  for (const m of seg.matchAll(/tag\/ico_([a-z_]+)\.png/g)) {
    const key = ICON_MAP[m[1]];
    if (key) rec.flags[key] = true;
  }

  const consigli = text.match(/CONSIGLI ASTA[^:]*:\s*([^]{0,600}?)\s*Ultimo aggiornamento/i);
  if (consigli) rec.consigli = consigli[1].trim();

  return rec;
}

async function main() {
  // 1. raccogli gli URL dei giocatori
  const urls = new Set<string>();
  for (const ruolo of RUOLI) {
    const html = await get(`${BASE}/lista-calciatori-serie-a/${ruolo}/`, `list-${ruolo}.html`);
    const $ = cheerio.load(html);
    $('article a').each((_, a) => {
      const href = $(a).attr('href');
      if (href && /\/lista-calciatori-serie-a\/.+\/\d+\//.test(href)) urls.add(href);
    });
    console.log(`${ruolo}: ${urls.size} URL totali finora`);
  }
  const all = [...urls];
  console.log(`\n${all.length} schede da elaborare...`);

  // 2. scarica e parserizza (con concorrenza limitata)
  const records: FpediaRecord[] = [];
  let done = 0;
  let errors = 0;
  async function worker(list: string[]) {
    for (const url of list) {
      try {
        const slug = url.split('/').filter(Boolean).slice(-1)[0];
        const html = await get(url, `p-${slug}`);
        const rec = parsePlayer(html, url);
        if (rec) records.push(rec);
      } catch (e) {
        errors++;
        if (errors < 15) console.warn('  !', (e as Error).message);
      }
      if (++done % 25 === 0) console.log(`  ${done}/${all.length}`);
    }
  }
  const chunks: string[][] = Array.from({ length: CONC }, () => []);
  all.forEach((u, i) => chunks[i % CONC].push(u));
  await Promise.all(chunks.map(worker));

  writeFileSync(join(CACHE, 'fpedia.json'), JSON.stringify(records, null, 1));
  const withFlags = records.filter((r) => Object.keys(r.flags).length).length;
  console.log(
    `\nScritti ${records.length} record in scripts/.cache/fpedia.json (errori: ${errors})` +
      `\n  con almeno un flag: ${withFlags}` +
      `\n  rigoristi: ${records.filter((r) => r.flags.rigorista).length}`,
  );
}

main();
