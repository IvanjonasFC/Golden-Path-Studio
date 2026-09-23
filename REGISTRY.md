# shadcn registry endpoint

Golden Path Studio serves every component in the shadcn **registry-item** format, so
you can install any of them into any project with the shadcn CLI (not only React ones).

## Routes

- `GET /r/<slug>.json` — a single component. The `<slug>` is the catalog id with `:`
  replaced by `__` (e.g. `uiverse:Buttons:author-1` → `uiverse__Buttons__author-1`).
- `GET /r/c/<slug>.json` — a whole collection / profile (all its files in one item).

In the web UI, each component and collection detail already has a **Copy** button with
the command ready (it uses the current origin: `localhost` in dev, your domain in prod).

## Using it in another project

Once per target project (if not already initialized):

```bash
npx shadcn@latest init
```

Then, with Golden Path Studio **running** (`npm run dev` → http://localhost:3000) or
deployed:

```bash
# one component
npx shadcn@latest add http://localhost:3000/r/magicui__Text__shiny-text.json

# a whole profile (your brand / stack)
npx shadcn@latest add http://localhost:3000/r/c/my-brand.json
```

The code lands in your project with its dependencies. Nothing needs to be deployed —
it works with the local web app running.

## Notes and limits

- **Best with React components** (Magic UI, Aceternity, shadcn, Cult, Kokonut):
  `type` = `registry:component`, placed according to your `components.json`.
- **Uiverse CSS/HTML** is served as `registry:file` with a target
  (`components/vault/uiverse/<file>.html`). It works, but copy-paste is often simpler
  for those.
- Each item embeds its `content` inline (what the CLI expects when reading a URL) plus a
  `meta` block with source, license and attribution (shadcn ignores it).
- Respect licenses: the prebuilt catalog is MIT.
