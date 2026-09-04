// Modello dati condiviso tra pipeline (scripts/) e app (src/)

export type Ruolo = 'P' | 'D' | 'C' | 'A';

export const RUOLI: Ruolo[] = ['P', 'D', 'C', 'A'];

export const RUOLO_LABEL: Record<Ruolo, string> = {
  P: 'Portieri',
  D: 'Difensori',
  C: 'Centrocampisti',
  A: 'Attaccanti',
};

/** Statistiche di una singola stagione (dai file "Statistiche" di fantacalcio.it) */
export interface StagioneStats {
  pv: number; // partite a voto
  mv: number | null; // media voto
  fm: number | null; // fantamedia
  golFatti: number;
  golSubiti: number;
  rigParati: number;
  rigCalciati: number;
  rigFatti: number; // segnati
  rigSbagliati: number;
  assist: number;
  amm: number;
  esp: number;
  autogol: number;
}

/** Dati arricchiti da fantacalciopedia (opzionali, presenti solo se lo scrape è stato eseguito) */
export interface FpediaData {
  punteggioAlgoritmo?: number; // /100
  punteggioFcp?: number;
  soliditaInvestimento?: number; // %
  resistenzaInfortuni?: number; // %
  presenzePreviste?: [number, number];
  golPrevisti?: [number, number];
  assistPrevisti?: [number, number];
  trend?: 'UP' | 'DOWN' | 'STABLE';
  consigli?: string;
  url?: string;
  panchinaro?: boolean;
  outsider?: boolean;
}

export interface PlayerFlags {
  rigorista: boolean;
  assistman: boolean;
  titolare: boolean;
  buonaMedia: boolean;
  goleador: boolean;
  fuoriclasse: boolean;
}

export type FlagKey = keyof PlayerFlags;

export const FLAG_META: { key: FlagKey; label: string; cls: string; descr: string }[] = [
  {
    key: 'rigorista',
    label: 'Rigorista',
    cls: 'rig',
    descr: 'Ha calciato ≥3 rigori nell’ultima stagione, o ≥2 in ciascuna delle ultime due.',
  },
  {
    key: 'titolare',
    label: 'Titolare',
    cls: 'tit',
    descr: 'Media presenze ≥24 su 38 nelle ultime due stagioni di Serie A.',
  },
  {
    key: 'goleador',
    label: 'Goleador',
    cls: 'gol',
    descr: 'Gol nell’ultima stagione ≥ soglia di ruolo (A 10 · C 6 · D 3).',
  },
  {
    key: 'assistman',
    label: 'Assistman',
    cls: 'ass',
    descr: 'Almeno 5 assist nell’ultima stagione (o media ≥4 sulle ultime due).',
  },
  {
    key: 'buonaMedia',
    label: 'Buona media',
    cls: 'med',
    descr: 'Media voto (senza bonus) ≥6.1 nell’ultima stagione, con ≥15 presenze.',
  },
  {
    key: 'fuoriclasse',
    label: 'Fuoriclasse',
    cls: 'fc',
    descr: 'Fantamedia storica pesata tra le migliori del reparto (top ~10%).',
  },
];

export interface Player {
  id: number; // id fantacalcio.it (stabile tra stagioni)
  nome: string; // come nel listone: "Martinez L."
  alias?: string; // nome esteso da fantacalciopedia: "Lautaro Martinez"
  squadra: string;
  ruolo: Ruolo;
  ruoloMantra: string[]; // es. ['T', 'A']
  qtA: number; // quotazione attuale Classic
  qtI: number; // quotazione iniziale Classic
  fvm: number; // fanta valore di mercato Classic
  // storico per stagione: chiave "2025-26"
  storico: Record<string, StagioneStats>;
  fpedia: FpediaData;
  flags: PlayerFlags; // calcolati dalle statistiche ufficiali (vedi FLAG_META)
  flagPerche: Partial<Record<FlagKey, string>>; // motivo del flag, es. "12 gol nel 2025-26"
  fpediaTags: string[]; // tag editoriali di fantacalciopedia (Fuoriclasse, Titolare, Panchinaro…)
  senzaStoricoSerieA: boolean; // true = flag stimati (nessuna stagione utile in A)
  // indici calcolati dalla pipeline
  convenienza: number | null; // 0-100, relativo al reparto
  prezzoConsigliato: number; // stima del prezzo d'asta in lega 12/500 (1 se fuori dai top)
  fmPesata: number | null; // fantamedia storica pesata
  affidabilita: number | null; // 0-1, quante presenze / continuità
  // provenienza di ogni campo per l'editing manuale in-app
  fonti: Record<string, 'listone' | 'stats' | 'fpedia' | 'euristica'>;
}

export interface RepartoStrategia {
  quotaPerSquadra: number; // crediti consigliati per quel reparto (su 500)
  poolLega: number; // crediti totali stimati sul reparto nella lega
  slotLega: number; // giocatori acquistati in totale (12 × slot rosa)
  spesaTop: number; // spesa media/squadra sui titolari del reparto secondo il modello
}

export interface PlayersMeta {
  generatoIl: string;
  stagioneCorrente: string;
  stagioni: string[];
  numGiocatori: number;
  conFpedia: number;
  senzaStoricoRecente: number[]; // id senza stats nell'ultima stagione conclusa
  strategia: Record<Ruolo, RepartoStrategia>;
}

// ---- Dati utente (persistiti nel browser) ----

export interface Team {
  id: string;
  nome: string;
}

export interface LeagueSettings {
  teams: Team[];
  budget: number;
  roster: Record<Ruolo, number>;
  tettiReparto: Partial<Record<Ruolo, number>>;
  myTeamId: string | null;
}

export interface TagDef {
  id: string;
  label: string;
  color: string;
}

export interface UserPlayerData {
  tags: string[]; // id di TagDef
  targetMax?: number;
  nota?: string;
  interesse?: 1 | 2 | 3 | 4 | 5;
  overrides?: {
    flags?: Partial<PlayerFlags>;
    qtA?: number;
    fvm?: number;
    ruolo?: Ruolo;
    squadra?: string;
  };
}

export interface AuctionRecord {
  playerId: number;
  teamId: string;
  prezzo: number;
  ts: number;
}
