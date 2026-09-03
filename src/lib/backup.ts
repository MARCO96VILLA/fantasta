import { useStore } from '../store.ts';

const KEYS = ['settings', 'tagDefs', 'userData', 'auction'] as const;

export function exportBackup() {
  const s = useStore.getState();
  const payload = {
    app: 'fantasta',
    version: 1,
    exportedAt: new Date().toISOString(),
    ...Object.fromEntries(KEYS.map((k) => [k, s[k]])),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fantasta-backup-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<void> {
  const data = JSON.parse(await file.text());
  if (data.app !== 'fantasta') throw new Error('File non riconosciuto');
  const patch: Record<string, unknown> = {};
  for (const k of KEYS) if (data[k] !== undefined) patch[k] = data[k];
  useStore.getState().replaceState(patch);
}
