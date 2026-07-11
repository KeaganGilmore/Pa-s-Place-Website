# Pa's Place Website (v2)

Ground-up rebuild of the Pa's Place website on a lightweight stack:

- **[Astro 7](https://astro.build)** — static-first framework; public pages ship zero JavaScript. Runs as a small Node server (standalone adapter) on Railway.
- **[Tailwind CSS v4](https://tailwindcss.com)** — styling.
- **[Keystatic](https://keystatic.com)** — git-based CMS. Admin UI at `/keystatic` writes content (JSON/Markdown) and images into this repo.

Design docs live in [docs/superpowers/specs/](docs/superpowers/specs/). The previous Next.js site is preserved in git history on `main` (pre-overhaul).

## Development

```bash
npm install
npm run dev
```

- Site: http://localhost:4321
- CMS admin: http://localhost:4321/keystatic (local mode — edits write straight to your working copy; commit them like any other change)

The CMS admin is protected by HTTP Basic Auth — default credentials `admin` / `rootpass`, overridable via `CMS_USER` / `CMS_PASSWORD` env vars. **Change these on the Railway service before going live.**

## Build & run

```bash
npm run build
node ./dist/server/entry.mjs
```

## Deployment (Railway)

`railway.json` sets the build (`npm run build`) and start (`node ./dist/server/entry.mjs`) commands. Railway provides `PORT`; `HOST=0.0.0.0` is set in the start command.

### Enabling CMS editing on the live site

Keystatic runs in **local** storage mode by default (dev only). For staff to edit from the deployed site, switch to **GitHub** mode:

1. Visit `/keystatic` on the deployed site (or run the Keystatic GitHub setup locally) and follow the flow to create a GitHub App for this repo.
2. Set these variables on the Railway service:
   - `KEYSTATIC_STORAGE=github`
   - `KEYSTATIC_GITHUB_REPO_OWNER` / `KEYSTATIC_GITHUB_REPO_NAME`
   - `KEYSTATIC_GITHUB_CLIENT_ID` / `KEYSTATIC_GITHUB_CLIENT_SECRET` / `KEYSTATIC_SECRET` (from the GitHub App)
3. Staff sign in with GitHub accounts that have access to the repo. Published edits are commits, which trigger a Railway redeploy (~1–2 min to go live).

## Project structure

```
src/
  pages/        # routes
  components/   # .astro components
  layouts/
  content/      # Keystatic-managed content (settings, page content)
  assets/       # images (Astro-optimized at build)
keystatic.config.ts   # CMS schema
astro.config.mjs
railway.json
```
