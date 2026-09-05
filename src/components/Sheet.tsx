import { useState, type ReactNode } from 'react';
import { useCloseOnBack } from '../lib/useCloseOnBack.ts';

/** Pulsante a icona che apre un pannello a scorrimento, richiudibile toccando fuori. */
export function SheetButton({
  icon,
  label,
  badge,
  children,
}: {
  icon: string;
  label: string;
  badge?: string | number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useCloseOnBack(open, () => setOpen(false));
  return (
    <>
      <button className={open ? 'primary' : ''} onClick={() => setOpen((o) => !o)}>
        <span aria-hidden>{icon}</span> {label}
        {badge != null && <span className="small"> · {badge}</span>}
      </button>
      {open && (
        <>
          <div className="sheet-backdrop" onClick={() => setOpen(false)} />
          <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>
                {icon} {label}
              </h3>
              <button className="ghost small" onClick={() => setOpen(false)} aria-label="Chiudi">
                ✕
              </button>
            </div>
            <div className="col" style={{ gap: 6 }}>
              {children}
            </div>
          </div>
        </>
      )}
    </>
  );
}
