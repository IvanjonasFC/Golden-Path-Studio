'use client';

/* ============================================================================
   AssetKit — primitivas compartidas para las vistas de gestión (Perfil/Activos):
   un Modal coherente con el tema y un menú contextual (kebab "…"). Mismo lenguaje
   visual que el resto (card-surface, radios, acento, superficie popover opaca).
   ============================================================================ */
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Modal centrado, theme-aware, cierre por overlay/Escape. */
export function Modal({
  open, onClose, title, children, footer, width = 460,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-popover)] shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)]">{title}</h3>
          <button type="button" onClick={onClose} className="ml-auto rounded-md p-1 text-[var(--color-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-text)]" aria-label="Cerrar">✕</button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/** Menú contextual "…" para las cards. Cierra al hacer clic fuera. */
export function CardMenu({ items, label = 'Acciones' }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-text)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-1 min-w-[168px] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-popover)] p-1 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); it.onClick(); }}
              className={
                'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ' +
                (it.disabled ? 'cursor-not-allowed opacity-40 ' : 'cursor-pointer ') +
                (it.danger
                  ? 'text-red-400 hover:bg-red-500/10 '
                  : 'text-[var(--color-text)] hover:bg-white/10 ')
              }
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Estado vacío elegante con CTA, compartido por los managers. */
export function EmptyState({ title, body, cta, onCta }: { title: string; body: string; cta: string; onCta: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-black/10 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-panel-2)] text-[var(--color-accent)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 5v14M5 12h14"/></svg>
      </div>
      <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
      <p className="max-w-sm text-sm text-[var(--color-muted)]">{body}</p>
      <button onClick={onCta} className="mt-1 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black transition-transform hover:scale-[1.02]">{cta}</button>
    </div>
  );
}

/** Fecha relativa breve en es/en, a partir de epoch ms. */
export function formatUpdated(ms?: number, lang: 'es' | 'en' = 'es'): string {
  if (!ms || !Number.isFinite(ms)) return lang === 'en' ? 'unknown' : 'sin fecha';
  const d = new Date(ms);
  const now = new Date();
  const day = 86400000;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / day);
  if (diffDays <= 0) return lang === 'en' ? 'today' : 'hoy';
  if (diffDays === 1) return lang === 'en' ? 'yesterday' : 'ayer';
  if (diffDays < 7) return lang === 'en' ? `${diffDays}d ago` : `hace ${diffDays} d`;
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' });
}
