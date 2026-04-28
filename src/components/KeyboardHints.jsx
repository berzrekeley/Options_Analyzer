import React, { useEffect } from 'react';
import { Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { key: 'P', desc: 'Toggle to Put' },
  { key: 'C', desc: 'Toggle to Call' },
  { key: '1', desc: 'Dashboard tab' },
  { key: '2', desc: 'Chain Matrix tab' },
  { key: '3', desc: 'Strategy Builder tab' },
  { key: '⌘ K', desc: 'Open command palette' },
  { key: '/', desc: 'Open command palette' },
  { key: 'ESC', desc: 'Close palette' },
  { key: '?', desc: 'This shortcuts menu' },
];

export const KeyboardHints = ({ open, onClose }) => {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="w-full max-w-xs bg-[#0d0d16] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
          <Keyboard className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Keyboard Shortcuts</span>
        </div>
        <div className="p-3 space-y-1">
          {SHORTCUTS.map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs text-slate-500">{desc}</span>
              <kbd className="mono text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded px-2 py-0.5">
                {key}
              </kbd>
            </div>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-white/5 text-[9px] text-slate-700 text-center">
          ESC to close
        </div>
      </div>
    </div>
  );
};
