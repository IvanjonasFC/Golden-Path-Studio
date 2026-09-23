"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentFile } from "@/lib/types";

type Bg = "dark" | "light" | "grid";
type Size = "full" | "tablet" | "mobile";

const BG: Record<Bg, string> = {
  dark: "#0b0b0f",
  light: "#f5f5f7",
  grid: "#0b0b0f",
};

const SIZE_PX: Record<Size, number | null> = {
  full: null,
  tablet: 768,
  mobile: 390,
};

import { withGuard, GUARD } from "@/lib/previewGuard";

/** Reconstruye el documento renderizable, pero con el fondo elegido por el usuario. */
function buildDoc(
  files: ComponentFile[],
  framework: string,
  previewHtml: string | null,
  bg: Bg,
): string {
  // Fuente del snippet: el primer fichero .html/.htm; si no, el previewHtml ya generado.
  const htmlFile = files.find((f) => /\.html?$/i.test(f.path));
  const gridLayer =
    bg === "grid"
      ? `background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:22px 22px;`
      : "";
  const fg = bg === "light" ? "#111" : "#eee";

  if (!htmlFile) {
    // Sin fuente HTML directa: usa el preview ya empaquetado (no controlamos su fondo).
    return withGuard(previewHtml ?? "<!doctype html><body></body>");
  }

  const tailwindCdn =
    framework === "tailwind"
      ? '<script src="https://cdn.tailwindcss.com"></script>'
      : "";

  // Inlinar assets LOCALES referenciados por el snippet (component.css, component.js,
  // styles.css…). Evita que el iframe pida http://<host>/component.css — que da 404 o
  // lo bloquea un adblock/Brave (ERR_BLOCKED_BY_CLIENT) — y deja el preview autocontenido.
  const findAsset = (ref: string) => {
    const base = ref.split(/[?#]/)[0].split("/").pop() || ref;
    return files.find((f) => f.path === ref || (f.path.split("/").pop() || "") === base) ?? null;
  };
  let html = htmlFile.content;
  html = html.replace(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi, (m, href) => {
    if (/^(https?:)?\/\//i.test(href)) return m;             // externos: se dejan
    const a = findAsset(href);
    return a ? `<style>\n${a.content}\n</style>` : m;
  });
  html = html.replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi, (m, src) => {
    if (/^(https?:)?\/\//i.test(src)) return m;              // externos (CDN): se dejan
    const a = findAsset(src);
    return a ? `<script>\n${a.content}\n</script>` : m;
  });

  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${tailwindCdn}
<style>
  *{box-sizing:border-box}
  html,body{height:100%;margin:0;overflow-x:hidden}
  img,video,canvas,svg{max-width:100%}
  body{display:grid;place-items:center;min-height:100vh;
    background:${BG[bg]};${gridLayer}color:${fg};
    font-family:system-ui,sans-serif;padding:24px}
</style></head><body>
${html}
${GUARD}</body></html>`;
}

export default function ComponentPreview({
  files,
  framework,
  previewHtml,
  thumbnail,
  name,
}: {
  files: ComponentFile[];
  framework: string;
  previewHtml: string | null;
  thumbnail: string | null;
  name: string;
}) {
  const [bg, setBg] = useState<Bg>("dark");
  const [size, setSize] = useState<Size>("full");
  const [nonce, setNonce] = useState(0); // para "replay" (re-monta el iframe)

  const doc = useMemo(
    () => buildDoc(files, framework, previewHtml, bg),
    [files, framework, previewHtml, bg],
  );

  const width = SIZE_PX[size];
  const hasLivePreview = Boolean(previewHtml || files.some((f) => /\.html?$/i.test(f.path)));
  const hasCode = files.some((f) => /\.(t|j)sx?$/.test(f.path));

  return (
    <div className="card-surface flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] shadow-xl">
      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Group label="Fondo">
            <Chip on={bg === "dark"} onClick={() => setBg("dark")}>Oscuro</Chip>
            <Chip on={bg === "light"} onClick={() => setBg("light")}>Claro</Chip>
            <Chip on={bg === "grid"} onClick={() => setBg("grid")}>Rejilla</Chip>
          </Group>
        </div>
        <div className="flex items-center gap-2">
          <Group label="Ancho">
            <Chip on={size === "mobile"} onClick={() => setSize("mobile")}>Móvil</Chip>
            <Chip on={size === "tablet"} onClick={() => setSize("tablet")}>Tablet</Chip>
            <Chip on={size === "full"} onClick={() => setSize("full")}>Full</Chip>
          </Group>
          <button
            onClick={() => setNonce((n) => n + 1)}
            title="Reiniciar animación"
            className="ml-2 flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-black/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)] transition-all hover:border-white/20 hover:bg-black/40 hover:text-white hover:shadow-md active:scale-95"
          >
            <span className="text-[14px] leading-none">↻</span> Replay
          </button>
        </div>
      </div>

      {/* Lienzo */}
      <div
        className="flex flex-1 justify-center overflow-auto p-3 transition-colors"
        style={{ background: bg === "light" ? "#e9e9ee" : "#08080c" }}
      >
        {hasLivePreview ? (
          <iframe
            key={`${bg}-${size}-${nonce}`}
            title={`preview-${name}`}
            srcDoc={doc}
            sandbox="allow-scripts allow-pointer-lock"
            className="h-full min-h-[420px] rounded-lg border border-[var(--color-border)] bg-transparent transition-all"
            style={{ width: width ? `${width}px` : "100%" }}
          />
        ) : hasCode ? (
          <RuntimePreview
            key={`rt-${nonce}`}
            files={files}
            name={name}
            width={width}
          />
        ) : thumbnail ? (
          /\.(mp4|mov)(\?.*)?$/i.test(thumbnail) ? (
            <div className="flex h-full min-h-[420px] w-full items-center justify-center rounded-lg bg-black p-2">
              <video
                src={thumbnail}
                controls
                autoPlay
                loop
                muted
                playsInline
                className="max-h-[600px] w-full rounded-lg object-contain"
              />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt={name}
              className="h-full min-h-[420px] max-h-[600px] w-full rounded-lg object-contain"
            />
          )
        ) : (
          <div className="grid h-full min-h-[420px] w-full place-items-center rounded-lg border border-dashed border-white/10 text-sm text-[var(--color-muted)]">
            Sin vista previa · mira el código abajo
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Preview en vivo de componentes React / Motion / Three vía el runtime aditivo
 * (/preview-runtime.html). Le envía los ficheros por postMessage; si el runtime
 * no consigue montar el componente, muestra un aviso y queda el código abajo.
 */
function RuntimePreview({
  files,
  name,
  width,
}: {
  files: ComponentFile[];
  name: string;
  width: number | null;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;
    setStatus("loading");
    const onMsg = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return;
      if (e.data?.type === "preview-ready") {
        iframe.contentWindow?.postMessage({ type: "preview", files }, "*");
        setStatus("ok");
      } else if (e.data?.type === "preview-error") {
        setStatus("error");
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [files]);

  return (
    <div className="relative" style={{ width: width ? `${width}px` : "100%" }}>
      <iframe
        ref={ref}
        title={`runtime-${name}`}
        src="/preview-runtime.html"
        sandbox="allow-scripts"
        className="h-[420px] w-full rounded-lg border border-[var(--color-border)] bg-transparent"
      />
      {status === "error" && (
        <div className="absolute inset-x-0 bottom-0 rounded-b-lg bg-black/70 px-3 py-2 text-center text-xs text-amber-300 backdrop-blur">
          Este componente no se pudo montar en vivo (depende de otros ficheros o librerías). Tienes el código completo abajo.
        </div>
      )}
      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-xs text-[var(--color-muted)]">
          Montando componente…
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mr-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-white">{label}</span>
      <div className="flex gap-1">{children}</div>
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all ${
        on
          ? "bg-[var(--color-accent)] text-black shadow-sm"
          : "bg-black/20 text-[var(--color-muted)] hover:bg-black/50 hover:text-white border border-transparent hover:border-white/10"
      }`}
    >
      {children}
    </button>
  );
}
