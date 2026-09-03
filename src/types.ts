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
  piazzati: boolean;
}

export const FLAG_META: { key: keyof PlayerFlags; label: string; cls: string }[] = [
  { key: 'rigorista', label: 'Rigorista', cls: 'rig' },
  { key: 'assistman', label: 'Assistman', cls: 'ass' },
  { key: 'titolare', label: 'Titolare', cls: 'tit' },
  { key: 'buonaMedia', label: 'Buona media', cls: 'med' },
  { key: 'goleador', label: 'Goleador', cls: 'gol' },
  { key: 'fuoriclasse', label: 'Fuoriclasse', cls: 'fc' },
  { key: 'piazzati', label: 'Calci piazzati', cls: 'ass' },
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
  flags: PlayerFlags;
  // indice calcolato dalla pipeline
  convenienza: number | null; // 0-100, relativo al reparto
  fmPesata: number | null; // fantamedia storica pesata
  affidabilita: number | null; // 0-1, quante presenze / continuità
  // provenienza di ogni campo per l'editing manuale in-app
  fonti: Record<string, 'listone' | 'stats' | 'fpedia' | 'euristica'>;
}

export interface PlayersMeta {
  generatoIl: string;
  stagioneCorrente: string;
  stagioni: string[];
  numGiocatori: number;
  conFpedia: number;
  senzaStoricoRecente: number[]; // id senza stats nell'ultima stagione conclusa
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
