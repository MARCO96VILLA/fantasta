import type { Player, PlayersMeta } from './types.ts';
import raw from './data/players.json';
import metaRaw from './data/players.meta.json';

export const PLAYERS = raw as unknown as Player[];
export const META = metaRaw as PlayersMeta;

export const PLAYER_BY_ID = new Map<number, Player>(PLAYERS.map((p) => [p.id, p]));

/** stagioni concluse, dalla più recente */
export const STAGIONI_STORICHE = META.stagioni
  .filter((s) => s !== META.stagioneCorrente)
  .sort()
  .reverse();

export const SQUADRE = [...new Set(PLAYERS.map((p) => p.squadra))].sort();
