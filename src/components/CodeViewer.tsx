"use client";

import { useEffect, useState } from "react";
import type { ComponentFile } from "@/lib/types";

function CopyBtn({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard bloqueado */
        }
      }}
      className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium"
    >
      {done ? "✓ Copiado" : label}
    </button>
  );
}

/**
 * Comando `shadcn add` apuntando a tu registry local (/r/<slug>.json).
 * Calcula la URL en cliente con el origin actual (localhost en dev, tu dominio en prod).
 */
export function RegistryInstall({
  id,
  kind = "component",
}: {
  id: string;
  kind?: "component" | "collection";
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const origin = window.location.origin;
    const slug = kind === "collection" ? id : id.replace(/:/g, "__");
    const path = kind === "collection" ? `/r/c/${slug}.json` : `/r/${slug}.json`;
    setUrl(`${origin}${path}`);
  }, [id, kind]);
  const cmd = url ? `npx shadcn@latest add ${url}` : "";
  return (
    <div className="card-surface flex items-center justify-between gap-3 rounded-lg p-3">
      <code className="overflow-x-auto whitespace-nowrap text-xs text-[var(--color-accent-2)]">
        {cmd || "…"}
      </code>
      <CopyBtn text={cmd} label="Copiar" />
    </div>
  );
}

export function InstallCommand({ cmd }: { cmd: string }) {
  return (
    <div className="card-surface flex items-center justify-between gap-3 rounded-lg p-3">
      <code className="overflow-x-auto whitespace-nowrap text-xs text-[var(--color-accent-2)]">
        {cmd}
      </code>
      <CopyBtn text={cmd} />
    </div>
  );
}

export function CodeViewer({ files }: { files: ComponentFile[] }) {
  const [active, setActive] = useState(0);
  if (files.length === 0) return null;
  const file = files[active] ?? files[0];

  return (
    <div className="card-surface flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] shadow-xl">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-panel-2)] px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <button
              key={f.path + i}
              onClick={() => setActive(i)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                i === active
                  ? "bg-[var(--color-accent)] text-black"
                  : "bg-black/30 text-[var(--color-muted)] hover:bg-black/50 hover:text-white"
              }`}
            >
              {f.path.split("/").pop()}
            </button>
          ))}
        </div>
        <CopyBtn text={file.content} label="Copiar código" />
      </div>
      <pre className="flex-1 overflow-auto bg-[#050505] p-5 text-xs leading-relaxed text-[var(--color-text)]">
        <code>{file.content}</code>
      </pre>
    </div>
  );
}
