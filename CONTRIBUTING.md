# Contributing to Golden Path Studio

Thanks for your interest. Golden Path Studio is a local-first tool for cataloging UI
components and defining reusable brand blueprints.

## Prerequisites

- Node.js 20+ (22 recommended)
- git on your `PATH`

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

Populate the catalog with `npm run ingest` (the database is not committed and is
regenerated from the sources).

## Workflow

1. Branch from `main`: `git checkout -b feat/my-change`.
2. Match the existing code style. Before opening a PR:
   ```bash
   npm run lint
   npm run build
   ```
3. Use clear commit messages — Conventional Commits are encouraged
   (`feat:`, `fix:`, `docs:`, `chore:` …).
4. Open a Pull Request describing the change and its motivation.

## Architecture principles

- **One engine.** Search, blueprint resolution and scene rendering each have a single
  implementation shared by every surface (web, MCP, exporter). Do not add parallel
  pipelines.
- **Deterministic and traceable.** Inferred values travel with their origin and are
  validated; never silently overwrite a required value with a default.
- **Reference, don't duplicate.** Collections and scenes reference catalog components by
  id; assignments are preserved, never silently deleted.
- **Incremental.** Extend through adapters, slots and layers — no big-bang rewrites.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design.

## Adding a source

Create an adapter under `src/ingest/`, register it in the `ADAPTERS` map in
`src/ingest/index.ts`, and run `npm run ingest -- --source <name>`. The web and MCP
server need no changes — they read the same table.

## Reporting issues

Use the bug / feature templates in `.github/ISSUE_TEMPLATE`. For security reports, see
[SECURITY.md](SECURITY.md) instead of opening a public issue.
