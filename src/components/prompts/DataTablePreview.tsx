"use client";

import { useState, useMemo } from "react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Member" | "Viewer" | "Billing";
  status: "Active" | "Invited" | "Suspended";
  lastActive: string;
  avatar: string;
}

const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: "usr_01",
    name: "Elena Rostova",
    email: "elena@acme-corp.com",
    role: "Admin",
    status: "Active",
    lastActive: "Hace 2 minutos",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
  },
  {
    id: "usr_02",
    name: "Marcus Thorne",
    email: "marcus.t@acme-corp.com",
    role: "Member",
    status: "Active",
    lastActive: "Hace 15 minutos",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
  },
  {
    id: "usr_03",
    name: "Sofia Chen",
    email: "sofia.chen@acme-corp.com",
    role: "Admin",
    status: "Active",
    lastActive: "Ayer a las 18:40",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80",
  },
  {
    id: "usr_04",
    name: "Lucas Vance",
    email: "lucas.v@acme-corp.com",
    role: "Viewer",
    status: "Invited",
    lastActive: "Invitación pendiente",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
  },
  {
    id: "usr_05",
    name: "Aria Montgomery",
    email: "aria.m@partner.io",
    role: "Billing",
    status: "Active",
    lastActive: "Hace 2 días",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
  },
  {
    id: "usr_06",
    name: "David K.",
    email: "david.k@consulting.com",
    role: "Viewer",
    status: "Suspended",
    lastActive: "Hace 3 semanas",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80",
  },
];

export default function DataTablePreview() {
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_MEMBERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamMember["role"]>("Member");

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || m.role === roleFilter;
      const matchStatus = statusFilter === "all" || m.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [members, search, roleFilter, statusFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredMembers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMembers.map((m) => m.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const deleteSelected = () => {
    setMembers(members.filter((m) => !selectedIds.includes(m.id)));
    setSelectedIds([]);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    const newM: TeamMember = {
      id: `usr_${Date.now()}`,
      name: inviteName || inviteEmail.split("@")[0],
      email: inviteEmail,
      role: inviteRole,
      status: "Invited",
      lastActive: "Invitación pendiente",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
    };
    setMembers([newM, ...members]);
    setInviteEmail("");
    setInviteName("");
    setShowInviteModal(false);
  };

  const roleColors: Record<TeamMember["role"], string> = {
    Admin: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    Member: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    Viewer: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    Billing: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  };

  const statusColors: Record<TeamMember["status"], string> = {
    Active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    Invited: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    Suspended: "bg-red-500/20 text-red-400 border-red-500/40",
  };

  return (
    <div className="flex flex-col w-full bg-[#08090f] text-white p-6 font-sans select-none min-h-[550px]">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">GESTIÓN DE EQUIPO</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-mono text-white/70">
              {members.length} Miembros
            </span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">Usuarios y Roles de Organización</h2>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="rounded-lg bg-sky-400 hover:bg-sky-300 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-sky-500/20 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span>+ Invitar Miembro</span>
        </button>
      </div>

      {/* Filters & Bulk Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Search Bar */}
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-white">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none w-44 placeholder-white/40"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#121624] px-3 py-1.5 text-white outline-none"
          >
            <option value="all">Todos los Roles</option>
            <option value="Admin">Admin</option>
            <option value="Member">Member</option>
            <option value="Viewer">Viewer</option>
            <option value="Billing">Billing</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#121624] px-3 py-1.5 text-white outline-none"
          >
            <option value="all">Todos los Estados</option>
            <option value="Active">Activo</option>
            <option value="Invited">Invitado</option>
            <option value="Suspended">Suspendido</option>
          </select>
        </div>

        {/* Bulk Action Bar (when selected) */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-sky-400/40 bg-sky-950/40 px-3 py-1 text-xs">
            <span className="font-bold text-sky-300">{selectedIds.length} seleccionados</span>
            <button
              onClick={deleteSelected}
              className="rounded bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/40 px-2 py-0.5 font-bold"
            >
              Eliminar
            </button>
            <button
              onClick={() => alert(`Exportando ${selectedIds.length} registros a CSV...`)}
              className="rounded bg-white/10 hover:bg-white/20 text-white px-2 py-0.5"
            >
              Exportar CSV
            </button>
          </div>
        )}
      </div>

      {/* Real Data Table */}
      <div className="mt-4 rounded-xl border border-white/10 overflow-hidden bg-[#0c0e18]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#121524] text-white/50 border-b border-white/10 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.length === filteredMembers.length && filteredMembers.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded accent-sky-400 cursor-pointer"
                />
              </th>
              <th className="p-3">Usuario</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Última Actividad</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredMembers.map((m) => {
              const isSelected = selectedIds.includes(m.id);
              return (
                <tr
                  key={m.id}
                  className={`hover:bg-white/5 transition-colors ${isSelected ? "bg-sky-500/10" : ""}`}
                >
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectRow(m.id)}
                      className="rounded accent-sky-400 cursor-pointer"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={m.avatar} alt={m.name} className="h-8 w-8 rounded-full object-cover border border-white/10" />
                      <div>
                        <div className="font-bold text-white text-xs">{m.name}</div>
                        <div className="text-[10px] text-white/50">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${roleColors[m.role]}`}>
                      {m.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusColors[m.status]}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {m.status}
                    </span>
                  </td>
                  <td className="p-3 text-white/60 font-mono text-[11px]">
                    {m.lastActive}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => alert(`Acciones para ${m.name}`)}
                      className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="1.5"/>
                        <circle cx="19" cy="12" r="1.5"/>
                        <circle cx="5" cy="12" r="1.5"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="mt-4 flex items-center justify-between text-xs text-white/50 pt-2 border-t border-white/5">
        <div>Mostrando {filteredMembers.length} de {members.length} miembros</div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white disabled:opacity-50">Anterior</button>
          <span className="font-bold text-white">1</span>
          <button className="rounded px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white disabled:opacity-50">Siguiente</button>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleInvite}
            className="w-full max-w-md rounded-2xl border border-sky-400/40 bg-[#121624] p-6 shadow-2xl flex flex-col gap-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">+ Invitar Nuevo Miembro al Equipo</h3>
              <button onClick={() => setShowInviteModal(false)} className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-white/60 uppercase text-[10px]">Nombre Completo</label>
              <input
                type="text"
                required
                placeholder="Ej: Daniel Castillo"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-white outline-none focus:border-sky-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-white/60 uppercase text-[10px]">Correo Electrónico</label>
              <input
                type="email"
                required
                placeholder="daniel@acme-corp.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-white outline-none focus:border-sky-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-white/60 uppercase text-[10px]">Rol de Acceso</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="rounded-lg border border-white/10 bg-black p-2 text-white outline-none"
              >
                <option value="Admin">Admin (Control Total)</option>
                <option value="Member">Member (Desarrollo y Edición)</option>
                <option value="Viewer">Viewer (Solo Lectura)</option>
                <option value="Billing">Billing (Facturación)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="rounded-lg px-4 py-2 text-white/60 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-sky-400 hover:bg-sky-300 px-5 py-2 font-bold text-black shadow-lg"
              >
                Enviar Invitación
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
