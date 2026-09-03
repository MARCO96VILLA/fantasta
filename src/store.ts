import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AuctionRecord,
  LeagueSettings,
  Ruolo,
  TagDef,
  UserPlayerData,
} from './types.ts';

const DEFAULT_TEAMS = Array.from({ length: 12 }, (_, i) => ({
  id: `t${i + 1}`,
  nome: `Squadra ${i + 1}`,
}));

const DEFAULT_SETTINGS: LeagueSettings = {
  teams: DEFAULT_TEAMS,
  budget: 500,
  roster: { P: 3, D: 8, C: 8, A: 6 },
  tettiReparto: {},
  myTeamId: null,
};

const DEFAULT_TAGS: TagDef[] = [
  { id: 'interessa', label: 'Mi interessa', color: '#7c3aed' },
  { id: 'titolare', label: 'Titolare mio', color: '#15803d' },
  { id: 'lowcost', label: 'Alternativa low-cost', color: '#b45309' },
  { id: 'no', label: 'Da evitare', color: '#b91c1c' },
  { id: 'dubbio', label: 'Dubbio', color: '#6b7280' },
];

interface State {
  settings: LeagueSettings;
  tagDefs: TagDef[];
  userData: Record<number, UserPlayerData>;
  auction: AuctionRecord[];

  // settings
  setBudget: (n: number) => void;
  setRoster: (r: Record<Ruolo, number>) => void;
  setTetto: (r: Ruolo, n: number | undefined) => void;
  renameTeam: (id: string, nome: string) => void;
  setMyTeam: (id: string | null) => void;

  // tags
  addTag: (label: string, color: string) => void;
  updateTag: (id: string, patch: Partial<TagDef>) => void;
  removeTag: (id: string) => void;

  // per-player user data
  togglePlayerTag: (playerId: number, tagId: string) => void;
  setTarget: (playerId: number, v: number | undefined) => void;
  setNota: (playerId: number, v: string) => void;
  setInteresse: (playerId: number, v: UserPlayerData['interesse']) => void;
  setOverride: (playerId: number, patch: UserPlayerData['overrides']) => void;

  // auction
  assign: (playerId: number, teamId: string, prezzo: number) => void;
  unassign: (playerId: number) => void;
  undoLast: () => void;
  resetAuction: () => void;

  // backup
  replaceState: (s: Partial<Pick<State, 'settings' | 'tagDefs' | 'userData' | 'auction'>>) => void;
}

function ud(state: State, id: number): UserPlayerData {
  return state.userData[id] ?? { tags: [] };
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      tagDefs: DEFAULT_TAGS,
      userData: {},
      auction: [],

      setBudget: (n) => set((s) => ({ settings: { ...s.settings, budget: n } })),
      setRoster: (r) => set((s) => ({ settings: { ...s.settings, roster: r } })),
      setTetto: (r, n) =>
        set((s) => {
          const t = { ...s.settings.tettiReparto };
          if (n == null || Number.isNaN(n)) delete t[r];
          else t[r] = n;
          return { settings: { ...s.settings, tettiReparto: t } };
        }),
      renameTeam: (id, nome) =>
        set((s) => ({
          settings: {
            ...s.settings,
            teams: s.settings.teams.map((t) => (t.id === id ? { ...t, nome } : t)),
          },
        })),
      setMyTeam: (id) => set((s) => ({ settings: { ...s.settings, myTeamId: id } })),

      addTag: (label, color) =>
        set((s) => ({
          tagDefs: [...s.tagDefs, { id: `tag_${Date.now().toString(36)}`, label, color }],
        })),
      updateTag: (id, patch) =>
        set((s) => ({ tagDefs: s.tagDefs.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTag: (id) =>
        set((s) => ({
          tagDefs: s.tagDefs.filter((t) => t.id !== id),
          userData: Object.fromEntries(
            Object.entries(s.userData).map(([k, v]) => [k, { ...v, tags: v.tags.filter((x) => x !== id) }]),
          ),
        })),

      togglePlayerTag: (playerId, tagId) =>
        set((s) => {
          const cur = ud(s, playerId);
          const tags = cur.tags.includes(tagId)
            ? cur.tags.filter((t) => t !== tagId)
            : [...cur.tags, tagId];
          return { userData: { ...s.userData, [playerId]: { ...cur, tags } } };
        }),
      setTarget: (playerId, v) =>
        set((s) => ({
          userData: { ...s.userData, [playerId]: { ...ud(s, playerId), targetMax: v } },
        })),
      setNota: (playerId, v) =>
        set((s) => ({ userData: { ...s.userData, [playerId]: { ...ud(s, playerId), nota: v } } })),
      setInteresse: (playerId, v) =>
        set((s) => ({
          userData: { ...s.userData, [playerId]: { ...ud(s, playerId), interesse: v } },
        })),
      setOverride: (playerId, patch) =>
        set((s) => ({
          userData: {
            ...s.userData,
            [playerId]: {
              ...ud(s, playerId),
              overrides: { ...ud(s, playerId).overrides, ...patch },
            },
          },
        })),

      assign: (playerId, teamId, prezzo) =>
        set((s) => ({
          auction: [
            ...s.auction.filter((a) => a.playerId !== playerId),
            { playerId, teamId, prezzo, ts: Date.now() },
          ],
        })),
      unassign: (playerId) =>
        set((s) => ({ auction: s.auction.filter((a) => a.playerId !== playerId) })),
      undoLast: () =>
        set((s) => {
          if (!s.auction.length) return s;
          const last = s.auction.reduce((a, b) => (a.ts > b.ts ? a : b));
          return { auction: s.auction.filter((a) => a !== last) };
        }),
      resetAuction: () => set({ auction: [] }),

      replaceState: (partial) => set((s) => ({ ...s, ...partial })),
    }),
    { name: 'fantasta-v1' },
  ),
);
