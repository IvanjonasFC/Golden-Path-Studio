import Link from "next/link";
import { notFound } from "next/navigation";
import { getComponent } from "@/lib/query";
import { CodeViewer, InstallCommand, RegistryInstall } from "@/components/CodeViewer";
import ComponentPreview from "@/components/ComponentPreview";
import AddToCollection from "@/components/AddToCollection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ComponentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = getComponent(decodeURIComponent(id));
  if (!c) notFound();

  return (
    <main className="mx-auto w-full max-w-[1700px] px-4 py-6 lg:px-8 h-[calc(100vh-70px)] flex flex-col overflow-hidden">
      {/* CABECERA (Ocupa todo el ancho) */}
      <div className="mb-5 shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">{c.name}</h1>
              {c.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 ml-1">
                  {c.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-white/5 px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              <span className="uppercase font-semibold text-[var(--color-accent)]">{c.source}</span>
              <span className="opacity-50"> · </span>
              {c.category}
              <span className="opacity-50"> · </span>
              {c.framework}
              <span className="opacity-50"> · </span>
              {c.platform}
              {c.author ? ` · por ${c.author}` : ""} {c.license ? `· ${c.license}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AddToCollection componentId={c.id} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr] flex-1 min-h-0">
        {/* COLUMNA IZQUIERDA (Preview e Instalacion) */}
        <div className="flex flex-col gap-5 h-full min-h-0">
          {/* Preview interactivo */}
          <section className="flex flex-col flex-1 min-h-[400px]">
            <ComponentPreview
              files={c.files}
              framework={c.framework}
              previewHtml={c.previewHtml}
              thumbnail={c.thumbnail}
              name={c.name}
            />
          </section>

          {/* Instalacion */}
          <section className="card-surface rounded-xl border border-[var(--color-border)] bg-[var(--color-panel-2)] p-6">
            <h2 className="mb-4 text-base font-semibold text-white">Instalar en tu proyecto</h2>
            <RegistryInstall id={c.id} />
            <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">
              Ejecuta este comando para descargar el código y las dependencias automáticamente en tu proyecto.
              Requiere tener <code>shadcn</code> inicializado y esta web de Golden Path Studio corriendo.
            </p>
            {c.installCommand && (
              <div className="mt-5 border-t border-white/5 pt-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Comando original de la fuente:
                </p>
                <InstallCommand cmd={c.installCommand} />
              </div>
            )}
            {c.dependencies.length > 0 && (
              <div className="mt-5 border-t border-white/5 pt-5 text-xs text-[var(--color-muted)]">
                <span className="font-semibold text-white">Dependencias requeridas:</span>{" "}
                <span className="text-[var(--color-accent-2)]">{c.dependencies.join(", ")}</span>
              </div>
            )}
          </section>
        </div>

        {/* COLUMNA DERECHA (Codigo) */}
        <div className="flex flex-col h-full min-h-[600px] xl:max-h-[calc(100vh-100px)] sticky top-6">
          <CodeViewer files={c.files} />
        </div>
      </div>
    </main>
  );
}
