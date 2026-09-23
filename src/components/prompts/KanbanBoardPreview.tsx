"use client";

import { useState } from "react";

interface KanbanCard {
  id: string;
  title: string;
  priority: "urgent" | "high" | "medium" | "low";
  tags: string[];
  subtasks: { done: number; total: number };
  dueDate: string;
  assignee: string;
  column: "backlog" | "in_progress" | "in_review" | "done";
}

const INITIAL_CARDS: KanbanCard[] = [
  {
    id: "ENG-402",
    title: "Implement Claude 3.7 Sonnet streaming agent fallback pipeline",
    priority: "urgent",
    tags: ["Backend", "AI Pipeline"],
    subtasks: { done: 3, total: 5 },
    dueDate: "Mañana",
    assignee: "Alex M.",
    column: "in_progress",
  },
  {
    id: "ENG-398",
    title: "Optimize WebGL shader memory allocation on mobile Safari",
    priority: "high",
    tags: ["Graphics", "Performance"],
    subtasks: { done: 2, total: 2 },
    dueDate: "24 Sep",
    assignee: "Sofia R.",
    column: "in_review",
  },
  {
    id: "ENG-411",
    title: "Linear-style drag-and-drop animations with spring physics",
    priority: "medium",
    tags: ["Frontend", "UI/UX"],
    subtasks: { done: 0, total: 3 },
    dueDate: "28 Sep",
    assignee: "David L.",
    column: "backlog",
  },
  {
    id: "ENG-380",
    title: "Zero-latency telemetry metrics collector with Edge SQLite",
    priority: "urgent",
    tags: ["Database", "Edge"],
    subtasks: { done: 4, total: 4 },
    dueDate: "Ayer",
    assignee: "Elena V.",
    column: "done",
  },
  {
    id: "ENG-415",
    title: "Biometric Passkey login support with WebAuthn RFC",
    priority: "medium",
    tags: ["Auth", "Security"],
    subtasks: { done: 1, total: 4 },
    dueDate: "30 Sep",
    assignee: "Alex M.",
    column: "backlog",
  },
  {
    id: "ENG-395",
    title: "Automated test suite coverage for multi-brand design tokens",
    priority: "low",
    tags: ["QA", "CI/CD"],
    subtasks: { done: 6, total: 6 },
    dueDate: "18 Sep",
    assignee: "Sofia R.",
    column: "done",
  },
];

export default function KanbanBoardPreview() {
  const [cards, setCards] = useState<KanbanCard[]>(INITIAL_CARDS);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"urgent" | "high" | "medium" | "low">("high");
  const [newTag, setNewTag] = useState("Frontend");

  const moveCard = (id: string, direction: "next" | "prev") => {
    const cols: KanbanCard["column"][] = ["backlog", "in_progress", "in_review", "done"];
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const curIdx = cols.indexOf(c.column);
        const newIdx = direction === "next" ? Math.min(cols.length - 1, curIdx + 1) : Math.max(0, curIdx - 1);
        return { ...c, column: cols[newIdx] };
      })
    );
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    const newCard: KanbanCard = {
      id: `ENG-${Math.floor(420 + Math.random() * 80)}`,
      title: newTitle,
      priority: newPriority,
      tags: [newTag],
      subtasks: { done: 0, total: 3 },
      dueDate: "Próx. semana",
      assignee: "Tú",
      column: "backlog",
    };
    setCards([newCard, ...cards]);
    setNewTitle("");
    setShowAddModal(false);
  };

  const filteredCards = cards.filter((c) => {
    const matchesSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = filterPriority === "all" || c.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const columns: { id: KanbanCard["column"]; label: string; dotColor: string }[] = [
    { id: "backlog", label: "Backlog", dotColor: "bg-slate-400" },
    { id: "in_progress", label: "En Progreso", dotColor: "bg-amber-400" },
    { id: "in_review", label: "En Revisión", dotColor: "bg-sky-400" },
    { id: "done", label: "Completado", dotColor: "bg-emerald-400" },
  ];

  return (
    <div className="flex flex-col w-full bg-[#08090d] text-white p-6 font-sans select-none min-h-[600px]">
      {/* Board Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-indigo-300">SPRINT 34 — AI MODEL INTEGRATION</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">Tablero de Gestión Linear Pro</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Filtrar por issue o palabra..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none w-36 sm:w-48 placeholder-white/40"
            />
          </div>

          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#12141c] px-3 py-1.5 text-xs font-semibold text-white outline-none"
          >
            <option value="all">Todas las Prioridades</option>
            <option value="urgent">Urgente (P0)</option>
            <option value="high">Alta (P1)</option>
            <option value="medium">Media (P2)</option>
            <option value="low">Baja (P3)</option>
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg active:scale-95 transition-all"
          >
            <span>+ Nueva Tarea</span>
          </button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {columns.map((col) => {
          const colCards = filteredCards.filter((c) => c.column === col.id);
          return (
            <div
              key={col.id}
              className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-3 min-h-[420px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-2 py-2 mb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${col.dotColor}`} />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{col.label}</span>
                </div>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-mono font-bold text-white/60">
                  {colCards.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto">
                {colCards.map((card) => (
                  <div
                    key={card.id}
                    className="group rounded-xl border border-white/10 bg-[#10131d] p-3.5 shadow-sm hover:border-indigo-400/50 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-white/50 mb-1.5">
                      <span className="font-bold text-indigo-400">{card.id}</span>
                      <span className="flex items-center gap-1.5">
                        {card.priority === "urgent" && (
                          <span className="flex items-center gap-1 text-red-400 font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                            Urgente
                          </span>
                        )}
                        {card.priority === "high" && (
                          <span className="flex items-center gap-1 text-amber-400 font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                            Alta
                          </span>
                        )}
                        {card.priority === "medium" && (
                          <span className="flex items-center gap-1 text-sky-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                            Media
                          </span>
                        )}
                        {card.priority === "low" && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                            Baja
                          </span>
                        )}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white leading-snug">
                      {card.title}
                    </h4>

                    {/* Subtasks Progress */}
                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-white/50">
                      <span>{card.subtasks.done}/{card.subtasks.total} subtareas</span>
                      <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-indigo-400"
                          style={{ width: `${(card.subtasks.done / card.subtasks.total) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="h-5 w-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold text-white text-[9px]">
                          {card.assignee.charAt(0)}
                        </span>
                        <span className="text-white/60">{card.dueDate}</span>
                      </div>

                      {/* Interactive Movement Buttons */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        {col.id !== "backlog" && (
                          <button
                            onClick={() => moveCard(card.id, "prev")}
                            title="Mover columna anterior"
                            className="rounded px-1.5 py-0.5 bg-white/10 hover:bg-white/20 text-white font-bold"
                          >
                            ←
                          </button>
                        )}
                        {col.id !== "done" && (
                          <button
                            onClick={() => moveCard(card.id, "next")}
                            title="Mover siguiente columna"
                            className="rounded px-1.5 py-0.5 bg-indigo-500/80 hover:bg-indigo-500 text-white font-bold"
                          >
                            →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAddCard}
            className="w-full max-w-md rounded-2xl border border-indigo-500/30 bg-[#121624] p-6 shadow-2xl flex flex-col gap-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">+ Añadir Nueva Tarea al Tablero</h3>
              <button onClick={() => setShowAddModal(false)} className="text-white/50 hover:text-white">✕</button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-white/60 uppercase text-[10px]">Título de la Tarea</label>
              <input
                type="text"
                required
                placeholder="Ej: Conectar endpoint de autenticación con Supabase"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-white outline-none focus:border-indigo-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-white/60 uppercase text-[10px]">Prioridad</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="rounded-lg border border-white/10 bg-black p-2 text-white outline-none text-xs"
                >
                  <option value="urgent">Urgente (P0)</option>
                  <option value="high">Alta (P1)</option>
                  <option value="medium">Media (P2)</option>
                  <option value="low">Baja (P3)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-white/60 uppercase text-[10px]">Área / Etiqueta</label>
                <select
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black p-2 text-white outline-none"
                >
                  <option value="Frontend">Frontend</option>
                  <option value="Backend">Backend</option>
                  <option value="AI Pipeline">AI Pipeline</option>
                  <option value="Auth">Auth & Security</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg px-4 py-2 text-white/60 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-indigo-500 hover:bg-indigo-400 px-5 py-2 font-bold text-white shadow-lg"
              >
                Crear Tarea
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
