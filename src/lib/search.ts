import Fuse from 'fuse.js';
import { PLAYERS } from '../data.ts';
import type { Player } from '../types.ts';

const fuse = new Fuse(PLAYERS, {
  keys: [
    { name: 'alias', weight: 0.6 },
    { name: 'nome', weight: 0.3 },
    { name: 'squadra', weight: 0.1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  useExtendedSearch: false,
});

export function searchPlayers(q: string, limit = 12): Player[] {
  const t = q.trim();
  if (!t) return [];
  return fuse.search(t, { limit }).map((r) => r.item);
}
