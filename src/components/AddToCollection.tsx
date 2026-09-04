"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface Col {
  id: string;
  name: string;
  kind: string;
  has?: boolean;
}

const POP_W = 240;

/**
 * Boton "＋ Coleccion" con popover para anadir/quitar un componente de las
 * colecciones del usuario, y crear una nueva al vuelo.
 * El popover se renderiza en un PORTAL a <body> con posicion fixed anclada al
 * boton: asi escapa de los `overflow-hidden` y el `transform` de la tarjeta del
 * catalogo (antes se recortaba dentro del preview).
 */
export default function AddToCollection({
  componentId,
  compact = false,
}: {
  componentId: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [cols, setCols] = useState<Col[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean }>({ left: 0, top: 0, above: false });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); };

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.max(8, Math.min(r.right - POP_W, window.innerWidth - POP_W - 8));
    const above = window.innerHeight - r.bottom < 300;
    setPos({ left, top: above ? r.top : r.bottom, above });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/collections?componentId=${encodeURIComponent(componentId)}`);
      const json = await res.json();
      setCols(json.items ?? []);
    } catch { setCols([]); }
    setLoading(false);
  }, [componentId]);

  // Reposicionar / cerrar mientras esta abierto.
  useEffect(() => {
    if (!open) return;
    const onScroll = () => place();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown, true);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown, true);
    };
  }, [open, place]);

  const toggle = async (col: Col) => {
    const method = col.has ? "DELETE" : "POST";
    const url = col.has
      ? `/api/collections/${col.id}/items?componentId=${encodeURIComponent(componentId)}`
      : `/api/collections/${col.id}/items`;
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: col.has ? undefined : JSON.stringify({ componentId }),
    });
    setCols((prev) => prev.map((c) => (c.id === col.id ? { ...c, has: !c.has } : c)));
  };

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const col: Col = await res.json();
    await fetch(`/api/collections/${col.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ componentId }),
    });
    setNewName("");
    setCols((prev) => [{ ...col, has: true }, ...prev]);
  };

  const popover = open && typeof document !== "undefined" ? createPortal(
    <div
      ref={popRef}
      onClick={stop}
      style={{
        position: "fixed", left: pos.left, top: pos.top, width: POP_W, zIndex: 9999,
        transform: pos.above ? "translateY(calc(-100% - 6px))" : "translateY(6px)",
      }}
      className="rounded-lg border border-[var(--color-border)] bg-[#14141b] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
    >
      <div className="max-h-52 overflow-auto">
        {loading ? (
          <p className="px-2 py-3 text-xs text-[var(--color-muted)]">Cargando...</p>
        ) : cols.length === 0 ? (
          <p className="px-2 py-2 text-xs text-[var(--color-muted)]">Aún no tienes colecciones. Crea una abajo.</p>
        ) : (
          cols.map((c) => (
            <button
              key={c.id}
              onClick={(e) => { stop(e); toggle(c); }}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/5"
            >
              <span className="truncate">
                <span className="mr-1 text-[10px] uppercase text-[var(--color-muted)]">{c.kind}</span>
                {c.name}
              </span>
              <span className={c.has ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"}>{c.has ? "✓" : "＋"}</span>
            </button>
          ))
        )}
      </div>
      <div className="mt-2 flex gap-1 border-t border-[var(--color-border)] pt-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") create(); }}
          placeholder="Nueva colección…"
          className="min-w-0 flex-1 rounded-md bg-[var(--color-panel-2)] px-2 py-1 text-xs outline-none"
        />
        <button onClick={(e) => { stop(e); create(); }} className="rounded-md bg-[var(--color-accent)] px-2 py-1 text-xs font-medium text-black">Crear</button>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          stop(e);
          const next = !open;
          if (next) { place(); load(); }
          setOpen(next);
        }}
        title="Añadir a una colección"
        className={
          compact
            ? "rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur hover:bg-[var(--color-accent)] hover:text-black"
            : "rounded-lg bg-[var(--color-accent)] px-3 py-2 text-xs font-medium text-black"
        }
      >
        ＋ Colección
      </button>
      {popover}
    </>
  );
}
