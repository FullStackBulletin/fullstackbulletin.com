# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the source code for [fullstackbulletin.com](https://fullstackbulletin.com), a static website for the FullStack Bulletin weekly newsletter. Built with Astro and Tailwind CSS, deployed to GitHub Pages.

## Common Commands

```bash
# Install dependencies
pnpm install

# Development (starts dev server with hot reload)
pnpm dev

# Production build (outputs to dist/)
pnpm build

# Preview production build
pnpm preview

# Run Playwright tests
pnpm test
```

## Architecture

### Build System
- **Framework**: Astro (static site generation)
- **Styling**: Tailwind CSS v4
- **Package Manager**: pnpm
- **Prebuild**: `generate-data-exports.mjs` and `generate-opml.mjs` generate data files

### Key Directories
- `src/` — Astro source: pages, components, layouts, lib, data, styles
- `src/content.config.ts` — Content collection config, loads `archive/*/metadata.json`
- `public/` — Static assets (logos, icons, archive images)
- `public/archive-images/` — Deduplicated images by SHA-256 hash (committed). Referenced from `metadata.json` as `./hash.ext`
- `archive/` — Scraped newsletter data (committed). Each issue: `metadata.json` + `index.html`
- `scripts/` — Utility scripts for scraping, metadata extraction, renaming, deduplication
- `tests/` — Playwright accessibility tests

### Deployment
GitHub Actions workflow (`.github/workflows/build.yml`) builds and deploys to `gh-pages` branch on push to `main`.

### Important Notes
- `archive/` and `public/archive-images/` are committed to the repo (not gitignored)
