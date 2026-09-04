import PerfilManager from "@/components/PerfilManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function PerfilPage() {
  return (
    <>
      {/* Veo de fondo atenuado: en una vista de gestión manda el contenido, no la rejilla. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{ background: "var(--color-bg)", opacity: 0.55 }} />
      <main className="mx-auto max-w-[1400px] px-5 py-8">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-gradient">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Perfil y activos
        </h1>
        <p className="mb-6 mt-1 text-sm text-[var(--color-muted)]">
          Tus marcas y colecciones, en local y listas para el catálogo y tu IA.
        </p>
        <PerfilManager />
      </main>
    </>
  );
}
