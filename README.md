# fullstackbulletin.com

Static website for [FullStack Bulletin](https://fullstackbulletin.com), a weekly newsletter for full-stack developers. Built with [Astro](https://astro.build/) and [Tailwind CSS](https://tailwindcss.com/).

## Quick start

```bash
pnpm install
pnpm dev       # Start dev server
pnpm build     # Production build (outputs to dist/)
pnpm preview   # Preview production build
pnpm test      # Run Playwright tests
```

## Project structure

```
├── archive/                  # Scraped newsletter data (committed)
├── public/archive-images/    # Deduplicated images by SHA-256 hash (committed)
├── scripts/                  # Utility scripts (scrape, extract, rename, deduplicate)
├── src/                      # Astro source (pages, components, layouts, lib)
├── public/                   # Static assets (logos, icons, archive images)
├── tests/                    # Playwright accessibility tests
```

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/scrape-archives.mjs` | Scrape newsletter archives from Buttondown |
| `scripts/extract-metadata.mjs` | Extract structured metadata from scraped HTML |
| `scripts/rename-archives.mjs` | Normalize archive folder names |
| `scripts/deduplicate-images.mjs` | Deduplicate images by SHA-256 hash |
| `scripts/fix-book-covers.mjs` | Fix missing book cover images |
| `scripts/renumber-issues.mjs` | Renumber issue metadata |

## Deployment

GitHub Actions (`.github/workflows/build.yml`) builds and deploys to the `gh-pages` branch on push to `main`.

## License

[MIT](LICENSE)
