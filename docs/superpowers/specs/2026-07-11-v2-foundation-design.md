# Pa's Place v2 — Foundation Design

**Date:** 2026-07-11
**Branch:** `overhaul/v2`
**Scope:** Base tech stack and repo reset only. Page designs, content modeling details, and new sections (galleries, news, donations) are explicitly out of scope and will be designed in follow-up specs.

## Goal

Rebuild the Pa's Place website from the ground up on a lightweight, fast stack, with a CMS so that content — photos and core information such as support/contact details — is editable by a mix of non-technical staff and the developer.

## Decisions

### Framework: Astro (v7 at time of scaffold)

- Static-first: public pages ship as plain HTML/CSS with zero JavaScript unless a component opts in.
- Node adapter (standalone) so the app runs as a small server on Railway; the Keystatic admin routes require server rendering, while all public pages remain prerendered.
- Built-in image optimization for photos in `src/assets/`.

### Styling: Tailwind CSS v4

Single styling system, replacing the previous mix of Tailwind 3, CSS modules, and SCSS.

### CMS: Keystatic (git mode)

- Admin UI served at `/keystatic`; writes content as JSON/Markdown files and images directly into the repo.
- Non-technical staff edit through the UI; the developer edits files directly. Everything is versioned in git.
- React is a dependency of the admin UI only — it never loads on public pages.
- **Local dev:** works with zero setup (`storage: { kind: 'local' }`).
- **Production:** requires a GitHub App connection (`storage: { kind: 'github' }`) so staff can log in from the live site. This is a documented follow-up setup step, not part of this foundation work.
- Trade-off accepted: publishing triggers a rebuild/redeploy (~1–2 min delay); photos live in the repo.

### Hosting: Railway (unchanged)

Same Railway project. `railway.json` updated for the Astro build and start commands.

## Repo layout after reset

```
src/
  pages/          # routes
  components/     # .astro components
  layouts/
  content/        # Keystatic-managed content (settings, page content, photo metadata)
  assets/         # images (Astro-optimized at build)
keystatic.config.ts
astro.config.mjs
railway.json
```

## The reset

On `overhaul/v2`, delete everything except `.git` and `docs/`. All old code, images, and configs remain recoverable from `main` and git history. Old photos worth keeping will be cherry-picked from `main` later, during content work. The first commit is a clean scaffold that builds and runs.

## Alternatives considered

- **Directus on Railway** — polished self-hosted admin with instant publishing, but adds a second service, Postgres, a volume, and ongoing maintenance (~$5–10/mo extra). Rejected as too heavy for the need.
- **Sanity (hosted)** — best-in-class editor UX and image CDN on a free tier, but content would live in third-party SaaS rather than the repo/Railway. Rejected in favor of keeping everything in git.
- **Staying on Next.js (+ Payload)** — not lightweight; the overhaul's explicit goal is a leaner stack.
