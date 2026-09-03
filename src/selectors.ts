import { PLAYER_BY_ID } from './data.ts';
import type { AuctionRecord, LeagueSettings, Player, Ruolo, UserPlayerData } from './types.ts';
import { RUOLI } from './types.ts';

export interface TeamStatus {
  id: string;
  nome: string;
  isMine: boolean;
  acquisti: { rec: AuctionRecord; player: Player }[];
  spesa: number;
  residuo: number;
  slotTotali: number;
  slotOccupati: number;
  slotLiberi: number;
  perRuolo: Record<Ruolo, { occ: number; tot: number; spesa: number }>;
  maxOfferta: number; // quanto può spendere su un singolo giocatore lasciando 1 credito per slot
}

export function teamStatus(
  settings: LeagueSettings,
  auction: AuctionRecord[],
  teamId: string,
): TeamStatus {
  const team = settings.teams.find((t) => t.id === teamId)!;
  const recs = auction.filter((a) => a.teamId === teamId);
  const acquisti = recs
    .map((rec) => ({ rec, player: PLAYER_BY_ID.get(rec.playerId)! }))
    .filter((x) => x.player)
    .sort((a, b) => b.rec.ts - a.rec.ts);

  const perRuolo = Object.fromEntries(
    RUOLI.map((r) => [r, { occ: 0, tot: settings.roster[r], spesa: 0 }]),
  ) as TeamStatus['perRuolo'];
  let spesa = 0;
  for (const { rec, player } of acquisti) {
    perRuolo[player.ruolo].occ++;
    perRuolo[player.ruolo].spesa += rec.prezzo;
    spesa += rec.prezzo;
  }
  const slotTotali = RUOLI.reduce((n, r) => n + settings.roster[r], 0);
  const slotOccupati = acquisti.length;
  const slotLiberi = slotTotali - slotOccupati;
  const residuo = settings.budget - spesa;
  return {
    id: teamId,
    nome: team.nome,
    isMine: settings.myTeamId === teamId,
    acquisti,
    spesa,
    residuo,
    slotTotali,
    slotOccupati,
    slotLiberi,
    perRuolo,
    maxOfferta: Math.max(0, residuo - Math.max(0, slotLiberi - 1)),
  };
}

export function allTeamStatus(settings: LeagueSettings, auction: AuctionRecord[]): TeamStatus[] {
  return settings.teams.map((t) => teamStatus(settings, auction, t.id));
}

export interface Taken {
  teamId: string;
  teamNome: string;
  prezzo: number;
}

export function takenIndex(
  settings: LeagueSettings,
  auction: AuctionRecord[],
): Map<number, Taken> {
  const names = new Map(settings.teams.map((t) => [t.id, t.nome]));
  return new Map(
    auction.map((a) => [
      a.playerId,
      { teamId: a.teamId, teamNome: names.get(a.teamId) ?? '?', prezzo: a.prezzo },
    ]),
  );
}

/** Applica gli override manuali dell'utente sopra al giocatore del catalogo. */
export function effectivePlayer(p: Player, u?: UserPlayerData): Player {
  if (!u?.overrides) return p;
  return {
    ...p,
    ...u.overrides,
    flags: { ...p.flags, ...(u.overrides.flags ?? {}) },
  };
}

export interface ObiettivoRiga {
  player: Player;
  u: UserPlayerData;
  taken?: Taken;
}

/** I giocatori taggati "mi interessa"/interesse alto, ancora liberi o presi. */
export function obiettivi(
  userData: Record<number, UserPlayerData>,
  taken: Map<number, Taken>,
): ObiettivoRiga[] {
  const out: ObiettivoRiga[] = [];
  for (const [idStr, u] of Object.entries(userData)) {
    const id = Number(idStr);
    const interessante = u.tags.includes('interessa') || (u.interesse ?? 0) >= 4 || u.targetMax != null;
    if (!interessante) continue;
    const player = PLAYER_BY_ID.get(id);
    if (!player) continue;
    out.push({ player, u, taken: taken.get(id) });
  }
  return out.sort((a, b) => (b.u.interesse ?? 0) - (a.u.interesse ?? 0) || b.player.qtA - a.player.qtA);
}
