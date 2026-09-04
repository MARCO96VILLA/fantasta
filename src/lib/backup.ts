import { useStore } from '../store.ts';

const KEYS = ['settings', 'tagDefs', 'userData', 'auction'] as const;

function payload() {
  const s = useStore.getState();
  return {
    app: 'fantasta',
    version: 1,
    exportedAt: new Date().toISOString(),
    ...Object.fromEntries(KEYS.map((k) => [k, s[k]])),
  };
}

function applyPayload(data: Record<string, unknown>) {
  if (data.app !== 'fantasta') throw new Error('File/testo non riconosciuto');
  const patch: Record<string, unknown> = {};
  for (const k of KEYS) if (data[k] !== undefined) patch[k] = data[k];
  useStore.getState().replaceState(patch);
}

export function exportBackup() {
  const blob = new Blob([JSON.stringify(payload(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fantasta-backup-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<void> {
  applyPayload(JSON.parse(await file.text()));
}

/** Backup come stringa (per copia/incolla, comodo da telefono). */
export async function copyBackupToClipboard(): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(payload()));
}

export function importBackupText(text: string): void {
  applyPayload(JSON.parse(text.trim()));
}
