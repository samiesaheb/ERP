'use client';

import { useRef, useState } from 'react';

export interface SwipeAction {
  label: string;
  sublabel?: string;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'dark';
}

const BG: Record<string, string> = {
  primary: 'bg-blue-500 hover:bg-blue-600 text-white',
  danger:  'bg-red-500  hover:bg-red-600  text-white',
  dark:    'bg-neutral-800 hover:bg-neutral-700 text-white',
};

const ACTION_W  = 76;  // px per action button
const THRESHOLD = 48;  // px before committing to open
const MAX_OVER  = 8;   // rubber-band overshoot multiplier

interface SwipeCardProps {
  children: React.ReactNode;
  actions: SwipeAction[];
  className?: string;
}

export default function SwipeCard({ children, actions, className = '' }: SwipeCardProps) {
  const panelW = actions.length * ACTION_W;
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);
  const startX   = useRef(0);
  const startOff = useRef(0);
  const active   = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [role="button"], [role="menuitem"]')) return;
    startX.current   = e.clientX;
    startOff.current = offset;
    active.current   = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!active.current) return;
    const raw = startOff.current + (e.clientX - startX.current);
    const next = raw < -panelW
      ? -panelW - Math.sqrt(Math.abs(raw + panelW)) * MAX_OVER * 0.4
      : Math.min(0, raw);
    offsetRef.current = next;
    setOffset(next);
  }

  function onPointerUp() {
    if (!active.current) return;
    active.current = false;
    setOffset(offsetRef.current < -THRESHOLD ? -panelW : 0);
    offsetRef.current = offsetRef.current < -THRESHOLD ? -panelW : 0;
  }

  function close() { offsetRef.current = 0; setOffset(0); }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ touchAction: 'pan-y' }}>
      {/* ── Compact action panel, right-anchored ── */}
      <div
        className="absolute top-0 right-0 h-full flex"
        style={{ width: panelW }}
        aria-hidden={offset === 0}
      >
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => { a.onClick(); close(); }}
            style={{ width: ACTION_W }}
            className={`flex flex-col items-center justify-center gap-1 transition-colors
                        text-[11px] font-semibold ${BG[a.variant ?? 'dark']}`}
          >
            <span>{a.label}</span>
            {a.sublabel && <span className="text-[10px] font-normal opacity-70">{a.sublabel}</span>}
          </button>
        ))}
      </div>

      {/* ── Sliding content ── */}
      <div
        style={{
          transform:  `translateX(${offset}px)`,
          transition: active.current ? 'none' : 'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
          touchAction: 'pan-y',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>
    </div>
  );
}
