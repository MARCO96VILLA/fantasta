import { useEffect } from 'react';
import { create } from 'zustand';
import { PlayerCard } from './PlayerCard.tsx';
import { AssignPanel } from './AssignPanel.tsx';

interface ModalState {
  playerId: number | null;
  withAssign: boolean;
  open: (id: number, withAssign?: boolean) => void;
  close: () => void;
}
export const usePlayerModal = create<ModalState>((set) => ({
  playerId: null,
  withAssign: false,
  open: (id, withAssign = true) => set({ playerId: id, withAssign }),
  close: () => set({ playerId: null }),
}));

export function PlayerModal() {
  const { playerId, withAssign, close } = usePlayerModal();
  useEffect(() => {
    if (playerId == null) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playerId, close]);

  if (playerId == null) return null;
  return (
    <div className="overlay" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div
          className="row"
          style={{
            justifyContent: 'flex-end',
            padding: '8px 8px 0',
            position: 'sticky',
            top: 0,
            background: 'var(--panel)',
            zIndex: 2,
          }}
        >
          <button className="ghost" onClick={close} aria-label="Chiudi">
            ✕
          </button>
        </div>
        <div className="col" style={{ padding: '0 16px 18px', gap: 14 }}>
          <PlayerCard key={playerId} playerId={playerId} />
          {withAssign && (
            <div style={{ paddingBottom: 96 }}>
              <AssignPanel playerId={playerId} onDone={close} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
