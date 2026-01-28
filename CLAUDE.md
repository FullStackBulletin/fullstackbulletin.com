# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the source code for [fullstackbulletin.com](https://fullstackbulletin.com), a static website for the FullStack Bulletin weekly newsletter. The site is built with Pug templates, SCSS, and Webpack, then deployed to GitHub Pages.

## Common Commands

```bash
# Install dependencies
pnpm install

# Development (starts dev server with hot reload)
pnpm dev

# Production build (outputs to dist/)
pnpm prod:build

# Run tests
pnpm test
```

## Architecture

### Build System
- **Package Manager**: pnpm
- **Templates**: Pug (`.pug` files in `views/`)
- **Styles**: SCSS compiled with node-sass (ITCSS architecture in `assets/scss/`)
- **JavaScript**: ES2015+ transpiled with Babel, bundled with Webpack
- **Environment**: Uses `NODE_ENV` and `PACKAGE_OUTPUT` env vars to switch between dev/production

### Key Directories
- `views/` - Pug templates; `index.pug` extends `_layout.pug`, components in `views/components/`
- `assets/scss/` - ITCSS-organized styles (1-settings through 8-trumps)
- `assets/scripts/` - JavaScript entry point at `main.js`
- `settings/data.yml` - Site content data (newsletter config, sponsors, FAQ, founders)
- `build-utilities/` - Build helper scripts (Babel src in `src/`, compiled to `lib/`)
- `dist/` - Production output
- `dev/` - Development output

### Deployment
GitHub Actions workflow (`.github/workflows/build.yml`) builds and deploys to `gh-pages` branch on push to `main`.
