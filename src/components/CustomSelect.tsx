'use client';

/* ============================================================================
   CustomSelect — desplegable propio, coherente con el tema (dark/light) y con
   el resto del sistema (botones, pills, cards, toolbar). Sustituye a los
   <select> nativos en toda la web para un look & feel premium y uniforme.

   - Trigger con el mismo lenguaje visual que la toolbar (rounded-lg, borde,
     panel-2, hover/focus acento, chevron que gira).
   - Menú flotante sobre superficie del tema (nada de #hex hardcodeado), con
     scroll, ítem activo en acento y hover suave.
   - Accesible: teclado (Enter/Espacio/flechas/Escape/Home/End), cierre por
     clic fuera, roles ARIA.
   ============================================================================ */
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export function CustomSelect({
  value,
  options,
  onChange,
  placeholder = 'Seleccionar…',
  className = '',
  size = 'sm',
  title,
  ariaLabel,
  disabled = false,
}: {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md';
  title?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const selectedLabel = selected?.label ?? placeholder;
  const hasValue = !!selected;

  // Cierre por clic fuera.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Al abrir, resalta el seleccionado y hace scroll a él.
  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value);
    setActive(idx);
    const t = setTimeout(() => {
      const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
      el?.scrollIntoView({ block: 'nearest' });
    }, 0);
    return () => clearTimeout(t);
  }, [open, value, options]);

  const commit = useCallback(
    (v: string) => {
      onChange(v);
      setOpen(false);
    },
    [onChange],
  );

  const move = (dir: 1 | -1) => {
    setActive((prev) => {
      let i = prev;
      for (let step = 0; step < options.length; step++) {
        i = (i + dir + options.length) % options.length;
        if (!options[i]?.disabled) return i;
      }
      return prev;
    });
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); move(1); break;
      case 'ArrowUp': e.preventDefault(); move(-1); break;
      case 'Home': e.preventDefault(); setActive(options.findIndex((o) => !o.disabled)); break;
      case 'End': e.preventDefault(); { const idx = [...options].reverse().findIndex((o) => !o.disabled); setActive(idx < 0 ? -1 : options.length - 1 - idx); } break;
      case 'Enter': case ' ':
        e.preventDefault();
        if (active >= 0 && !options[active]?.disabled) commit(options[active].value);
        break;
      case 'Escape': e.preventDefault(); setOpen(false); break;
      case 'Tab': setOpen(false); break;
    }
  };

  const pad = size === 'sm' ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        title={title}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={
          `flex w-full items-center justify-between gap-2 rounded-lg border bg-[var(--color-panel-2)] ${pad} ` +
          `text-left text-[var(--color-text)] outline-none transition-colors ` +
          `border-[var(--color-border)] hover:border-[var(--color-accent)]/60 ` +
          `focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/30 ` +
          (open ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/25 ' : '') +
          (disabled ? 'cursor-not-allowed opacity-50 ' : 'cursor-pointer ')
        }
      >
        <span className={`truncate ${hasValue ? '' : 'text-[var(--color-muted)]'}`}>{selectedLabel}</span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden
          className={`shrink-0 text-[var(--color-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-y-auto overflow-x-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-popover)] p-1 shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
        >
          {options.length === 0 && (
            <div className="px-2.5 py-2 text-xs text-[var(--color-muted)]">Sin opciones</div>
          )}
          {options.map((o, i) => {
            const isSel = o.value === value;
            const isActive = i === active;
            return (
              <div
                key={o.value + i}
                role="option"
                aria-selected={isSel}
                data-active={isActive}
                onMouseEnter={() => setActive(i)}
                onClick={() => !o.disabled && commit(o.value)}
                className={
                  `flex items-center justify-between gap-2 truncate rounded-md px-2.5 py-1.5 text-xs transition-colors ` +
                  (o.disabled ? 'cursor-not-allowed opacity-40 ' : 'cursor-pointer ') +
                  (isSel
                    ? 'bg-[var(--color-accent)]/15 font-semibold text-[var(--color-accent)] '
                    : isActive
                      ? 'bg-[var(--color-text)]/10 text-[var(--color-text)] '
                      : 'text-[var(--color-text)] ')
                }
              >
                <span className="truncate">{o.label}</span>
                {isSel && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
