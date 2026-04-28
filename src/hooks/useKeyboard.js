import { useEffect } from 'react';

/**
 * shortcuts: Record<key, (e: KeyboardEvent) => void>
 * Keys are matched case-insensitively. Use 'mod+k' for Ctrl/Cmd+K.
 * Handlers are NOT fired when focus is inside an input/select/textarea.
 */
export const useKeyboard = (shortcuts) => {
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      for (const [combo, fn] of Object.entries(shortcuts)) {
        const parts = combo.toLowerCase().split('+');
        const key   = parts[parts.length - 1];
        const mod   = parts.includes('mod');
        const shift = parts.includes('shift');

        const modMatch   = mod   ? (e.metaKey || e.ctrlKey) : true;
        const shiftMatch = shift ? e.shiftKey                : true;
        const keyMatch   = e.key.toLowerCase() === key;

        if (modMatch && shiftMatch && keyMatch) {
          // Allow mod+key shortcuts even inside inputs (e.g. Cmd+K)
          if (isInput && !mod) continue;
          fn(e);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
};
