import fs from 'node:fs';
import path from 'node:path';

const catalogPath = path.resolve('data/prompts-catalog.json');
const items = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const newCommunityPrompts = [
  {
    id: 'comm_bento_linear_01',
    title: 'Linear-Style Dynamic Bento Grid',
    category: 'Cards & Bento',
    type: 'free',
    source: 'GitHub / awesome-v0-prompts',
    isAuthenticPrompt: true,
    hasPrompt: true,
    likesCount: 142,
    viewsCount: 6840,
    downloadsCount: 890,
    createdAt: '2026-09-12T14:20:00.000Z',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    animatedVideo: null,
    description: 'Bento Grid de 6 columnas asimétricas estilo Linear/Raycast con bordes hairline de 1px, spotlight radial interactivo en hover y chips de métricas.',
    prompt: `Build a production-ready, highly polished Bento Grid features section for a developer tools SaaS landing page. Use Next.js / React 19 and Tailwind CSS v4.

### 1. Canvas & Grid Architecture
- Container: max-w-7xl mx-auto px-6 py-24, background #08090d.
- Grid layout: 6-column CSS grid on desktop (grid-cols-1 md:grid-cols-6), auto-rows-[280px], gap-4.
- Tile 1 (Hero Feature): span 4 columns, 2 rows (col-span-4 row-span-2). Shows an animated interactive code snippet simulator with syntax highlighting.
- Tile 2 (Speed Metric): span 2 columns, 1 row (col-span-2 row-span-1). Large typography "0.4ms latency" with glowing radial backdrop.
- Tile 3 (Security & Compliance): span 2 columns, 1 row (col-span-2 row-span-1). SOC2 / HIPAA compliance badges with metallic gradient ring.
- Tile 4 (Global Edge Network): span 3 columns, 1 row (col-span-3 row-span-1). Interactive world map with pulsing ping beacons.
- Tile 5 (Instant Sync): span 3 columns, 1 row (col-span-3 row-span-1). Visual queue state with live checkmark animation.

### 2. Card Aesthetics & Micro-interactions
- Card Surface: background rgba(16, 18, 27, 0.75), backdrop-blur-xl, border 1px solid rgba(255, 255, 255, 0.08).
- Hover Spotlight Effect: Track mouse position per card and render a subtle radial gradient mask: radial-gradient(350px circle at var(--mouse-x) var(--mouse-y), rgba(56, 189, 248, 0.12), transparent 80%).
- Hairline highlight: top edge with 1px linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent).
- Corner radius: rounded-2xl throughout.

### 3. Typography & Hierarchy
- Font: Inter or Space Grotesk.
- Headings: font-semibold text-white tracking-tight text-lg mb-1.
- Descriptions: text-slate-400 text-sm leading-relaxed.`
  },
  {
    id: 'comm_command_palette_02',
    title: 'Command Palette (Cmd+K) & Spotlight Search',
    category: 'Modals & Popups',
    type: 'free',
    source: 'Reddit /r/vibecoding',
    isAuthenticPrompt: true,
    hasPrompt: true,
    likesCount: 98,
    viewsCount: 4320,
    downloadsCount: 650,
    createdAt: '2026-09-14T09:15:00.000Z',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
    animatedVideo: null,
    description: 'Modal de búsqueda universal con atajo ⌘K / Ctrl+K, navegación por teclado, filtro fuzzy, historial reciente y grupos categorizados.',
    prompt: `Create a fully accessible, keyboard-first Command Palette modal component for React 19 + Tailwind CSS.

### Specifications:
1. Trigger & Accessibility:
- Global shortcut listener for ⌘K (Mac) or Ctrl+K (Windows/Linux) and Escape to close.
- Full focus trapping inside the modal dialog with role="dialog" and aria-modal="true".
- ArrowUp / ArrowDown moves active selection; Enter triggers action.

2. Design & Aesthetics:
- Backdrop: fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-start justify-center pt-[15vh].
- Modal Dialog: w-full max-w-xl bg-[#0e111a] border border-white/12 rounded-2xl shadow-2xl overflow-hidden.
- Search Input: h-14 px-4 bg-transparent text-white placeholder-slate-500 text-base outline-none flex items-center gap-3 border-b border-white/8.
- Categories: "Recent Actions", "Navigation", "Tools & AI Agents", "Settings".
- Item Row: px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors; active state has bg-sky-500/15 text-sky-300 with 1px border border-sky-500/30.
- Keyboard Shortcut Badge: <kbd> rendered with border border-white/15 bg-white/5 rounded px-1.5 py-0.5 text-[11px] font-mono text-slate-400.

3. Features:
- Instant search filtering with highlighted match substrings.
- Empty state with clean search icon when no results match.
- Footer showing keyboard legend: ↑↓ to navigate · ↵ to select · esc to close.`
  },
  {
    id: 'comm_pricing_matrix_03',
    title: '3-Tier SaaS Pricing Matrix with Annual Toggle',
    category: 'Landing page',
    type: 'free',
    source: 'GitHub / UI-Prompt-Library',
    isAuthenticPrompt: true,
    hasPrompt: true,
    likesCount: 115,
    viewsCount: 5120,
    downloadsCount: 780,
    createdAt: '2026-09-10T11:00:00.000Z',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
    animatedVideo: null,
    description: 'Tabla de precios moderna de 3 niveles (Starter, Pro, Enterprise) con interruptor mensual/anual con descuento del 20% y tarjeta Pro destacada con brillo animado.',
    prompt: `Build a modern 3-tier SaaS pricing comparison component with monthly/annual billing switch for React + Tailwind CSS.

### 1. Structure & Layout
- Header: "Transparent, predictable pricing" with gradient pill badge "SAVE 20% ON ANNUAL PLANS".
- Switcher: Sleek pill toggle with smooth sliding background indicator on state change.
- 3 Cards (Starter @ $0, Pro @ $29/mo or $24/yr, Enterprise @ $99/mo or $79/yr).
- Pro Card Highlight: centered, slightly elevated scale-105, gradient border (linear-gradient(135deg, #38bdf8, #818cf8)), with badge "MOST POPULAR".

### 2. Feature Comparison Matrix
- Each card contains: Plan name, target audience, big price font with /month suffix, CTA button, and feature checklist.
- Checklist Icons: green checkmark SVG for included items, muted minus for excluded items.
- Tooltips on hover for advanced technical features.

### 3. CTA & Interactivity
- Starter CTA: ghost button "Get Started Free".
- Pro CTA: solid gradient button "Start 14-Day Free Trial" with pulse hover.
- Enterprise CTA: outlined white button "Talk to Sales".`
  },
  {
    id: 'comm_dashboard_telemetry_04',
    title: 'Dark SaaS Developer Analytics Dashboard',
    category: 'Dashboards',
    type: 'free',
    source: 'GitHub / awesome-v0-prompts',
    isAuthenticPrompt: true,
    hasPrompt: true,
    likesCount: 167,
    viewsCount: 8200,
    downloadsCount: 1200,
    createdAt: '2026-09-08T16:45:00.000Z',
    thumbnail: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&auto=format&fit=crop&q=80',
    animatedVideo: null,
    description: 'Dashboard analítico para desarrolladores con estadísticas en tiempo real, gráficos de sparkline, heatmap de actividad tipo GitHub y selector de rango temporal.',
    prompt: `Create a high-density developer telemetry dashboard component in dark mode for React 19 + Tailwind CSS.

### 1. Header & Quick Controls
- Left: Project switcher dropdown + Environment badge ("Production · us-east-1").
- Right: Live status dot (pulsing green: "All Systems Operational") + Time range selector (1h, 24h, 7d, 30d, Custom).

### 2. Metric KPI Cards (4-column grid)
- Total API Requests: 4.82M (+12.4% vs last week) with blue sparkline.
- Avg Response Time: 42ms (-8.1% vs last week) with green sparkline.
- Error Rate: 0.012% (Nominal) with amber status badge.
- Active Edge Nodes: 284 / 284 (100% capacity).

### 3. Main Chart & Activity Heatmap
- Central chart: Request throughput vs Latency over time with smooth SVG gradient fill and interactive hover crosshair tooltip.
- Activity Grid: 52-week commit/request density matrix with color gradation from deep slate to vibrant emerald.

### 4. Recent Logs Stream
- Real-time log table with timestamp in tabular numbers (font-mono), HTTP method badges (GET green, POST blue, DELETE red), status code pill, latency, and client IP.`
  },
  {
    id: 'comm_aurora_hero_05',
    title: 'Aurora Mesh Gradient AI Hero Section',
    category: 'Hero Section',
    type: 'free',
    source: 'Reddit /r/vibecoding',
    isAuthenticPrompt: true,
    hasPrompt: true,
    likesCount: 204,
    viewsCount: 9400,
    downloadsCount: 1450,
    createdAt: '2026-09-15T18:30:00.000Z',
    thumbnail: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80',
    animatedVideo: null,
    description: 'Hero section cinemático con fondo de aurora mesh animada en CSS, tipografía monumental en clamp(), input interactivo de prompt AI y logos de confianza con efecto marquee.',
    prompt: `Design a cinematic, high-conversion Hero Section for an AI automation workspace. Single-file React component with Tailwind CSS.

### 1. Background & Atmospheric Glow
- Base: #05060a (deep void black).
- Aurora Mesh: 3 radial gradient orbs with CSS animation (blur-[120px], opacity-40, animating positions slowly across 20s loop: violet #8b5cf6 at top left, cyan #06b6d4 at center right, rose #f43f5e at bottom center).
- Subtle dot matrix overlay: background-image radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), size 24px 24px.

### 2. Hero Content & Copywriting
- Announcement Pill: "✨ Introducing Autonomous Workflows 2.0 →" with shimmering animated border.
- Main Headline: "Build software at the speed of thought." using font-extrabold text-5xl md:text-7xl tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400.
- Subtitle: "Generate, deploy, and scale intelligent agent workflows without writing boilerplate. Integrated with your existing database and APIs."

### 3. Interactive Prompt Bar (Centerpiece)
- Floating search/prompt capsule: rounded-2xl bg-white/6 backdrop-blur-2xl border border-white/15 p-2 shadow-2xl max-w-2xl mx-auto flex items-center gap-3.
- Sparkle icon + dynamic placeholder text ("Describe your app or agent workflow...") + Model selector pill ("Claude 3.5 Sonnet") + Action button ("Generate App ↵").
- Quick suggestion chips below: "⚡ Stripe billing agent", "📊 Real-time CRM dashboard", "🤖 Slack support bot".

### 4. Social Proof Marquee
- "Trusted by engineering teams at": Infinite scrolling row of 6 clean monochrome SVGs with linear gradient masks on edges.`
  },
  {
    id: 'comm_auth_split_06',
    title: 'Editorial Split-Screen Authentication Portal',
    category: 'Login & Auth',
    type: 'free',
    source: 'GitHub / claude-ui-prompts',
    isAuthenticPrompt: true,
    hasPrompt: true,
    likesCount: 88,
    viewsCount: 3900,
    downloadsCount: 520,
    createdAt: '2026-09-05T12:00:00.000Z',
    thumbnail: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80',
    animatedVideo: null,
    description: 'Portal de inicio de sesión y registro dividido en 2 columnas: panel izquierdo con arte generativo y cita editorial, panel derecho con auth social y validación en tiempo real.',
    prompt: `Create a split-screen authentication and sign-in page component for React 19 + Tailwind CSS.

### Layout (2 Columns):
- Left Panel (hidden on mobile, 50% width on desktop):
  - Dark slate background with an atmospheric abstract geometric render.
  - Top left: Brand logo + name.
  - Bottom: High-impact quote: "The fastest way to take an idea from prompt to production in our team." with author avatar, name ("Elena Vance"), and title ("Head of Product at Nexus").

- Right Panel (Form):
  - Centered max-w-md w-full p-8 flex flex-col justify-center.
  - Header: "Welcome back" + "Enter your credentials to access your workspace."
  - Social Auth Buttons: "Continue with GitHub" and "Continue with Google" with SVG icons and 1px border.
  - Divider: "Or continue with email".
  - Form inputs: Work Email + Password with password toggle visibility icon (eye / eye-off) + "Forgot password?" link.
  - Primary Button: "Sign In to Workspace" (full-width, high-contrast, loading spinner state).
  - Security note: "Protected with end-to-end 256-bit encryption" + lock icon.
  - Footer link: "Don't have an account? Sign up for free".`
  },
  {
    id: 'comm_data_table_07',
    title: 'Interactive User & Team Management Data Table',
    category: 'Forms & Tables',
    type: 'free',
    source: 'GitHub / awesome-v0-prompts',
    isAuthenticPrompt: true,
    hasPrompt: true,
    likesCount: 134,
    viewsCount: 6100,
    downloadsCount: 940,
    createdAt: '2026-09-11T15:20:00.000Z',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
    animatedVideo: null,
    description: 'Tabla de datos completa con selección múltiple, paginación, filtros por rol/estado, avatares, ordenación por columnas y menú de acciones desplegable.',
    prompt: `Build a production-grade User & Team Management Table component for React 19 + Tailwind CSS.

### 1. Toolbar & Controls
- Search bar with instant debounced filter for name/email.
- Role Filter dropdown: All, Admin, Member, Viewer, Billing.
- Status Filter: All, Active, Invited, Suspended.
- Bulk Actions Bar (appears when 1+ rows selected): "Delete Selected", "Export CSV", "Change Role".
- Top right button: "+ Invite Team Member" (opens invite modal).

### 2. Table Column Structure
- Checkbox (Select all / Select row).
- User: Avatar with online status indicator + Name (bold) + Email (muted).
- Role: Badge with role-based colors (Admin = purple, Member = blue, Viewer = slate).
- Status: Status pill with dot indicator (Active = green, Pending = amber, Inactive = red).
- Last Active: Relative time (e.g. "2 minutes ago", "Yesterday") with tabular numerals.
- Actions: 3-dot dropdown menu ("Edit Profile", "View Activity", "Resend Invite", "Revoke Access").

### 3. Pagination & Footer
- Left: "Showing 1 to 10 of 148 team members".
- Right: Page navigation (Previous, 1, 2, 3, ..., Next) with rows per page selector (10, 25, 50).`
  },
  {
    id: 'comm_kanban_board_08',
    title: 'Modern Linear-Style Project Kanban Board',
    category: 'Cards & Bento',
    type: 'free',
    source: 'Reddit /r/vibecoding',
    isAuthenticPrompt: true,
    hasPrompt: true,
    likesCount: 178,
    viewsCount: 7900,
    downloadsCount: 1120,
    createdAt: '2026-09-13T10:40:00.000Z',
    thumbnail: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80',
    animatedVideo: null,
    description: 'Tablero Kanban para gestión de proyectos con 4 columnas (Backlog, En Progreso, En Revisión, Completado), etiquetas de prioridad y modales de tarea rápida.',
    prompt: `Create a responsive, Linear-inspired Kanban Board component in React + Tailwind CSS.

### 1. Board Header & Filters
- Board Title: "Sprint 34 — AI Model Integration".
- Quick Filters: "My Issues", "High Priority", "Unassigned", "Blocked".
- Search box + "+ New Issue" action button.

### 2. Columns (4 Columns):
1. Backlog (Count: 8)
2. In Progress (Count: 4)
3. In Review (Count: 3)
4. Done (Count: 14)

### 3. Task Card Structure:
- Priority indicator icon (Urgent red flame, High orange chevron, Medium yellow line, Low blue dot).
- Issue ID in font-mono (e.g., "ENG-402").
- Task Title: Clear, 2-line clamp.
- Tag pills (e.g., "Frontend", "Auth", "API", "Bug").
- Subtasks progress: e.g., "3/5 subtasks" with a mini progress bar.
- Footer: Due date badge + Assignee avatar (or "+" button if unassigned).

### 4. Micro-interactions:
- Hovering over a card shows a subtle lift effect (-translate-y-1) and brightens border from 8% to 20% opacity.
- Empty column state with "+ Add card" dashed placeholder.`
  }
];

let addedCount = 0;
for (const np of newCommunityPrompts) {
  if (!items.some(x => x.id === np.id)) {
    items.unshift(np);
    addedCount++;
  }
}

fs.writeFileSync(catalogPath, JSON.stringify(items, null, 2));
console.log(`Successfully added ${addedCount} community prompts. Total in catalog: ${items.length}`);
