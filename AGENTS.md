# FunnelAI — LTV Intelligence Platform

## Cursor Cloud specific instructions

### Overview

FunnelAI is an LTV Intelligence Platform for Signos (CGM company). It is a Next.js 14 static-export app with Netlify Functions for backend APIs and PostgreSQL via Prisma ORM.

### Running services

- **Dev server**: `npm run dev` — starts Next.js on port 3001
- **PostgreSQL**: Must be running locally. Start with `sudo pg_ctlcluster 16 main start`. Database: `funnelai`, user: `funnelai`, password: `funnelai`.
- **Database env vars** are in `.env.local` (`DATABASE_URL`, `DIRECT_URL`).

### Non-obvious caveats

- **Node 18 required**: The project targets Node 18 (set in `netlify.toml`). Use `nvm use 18` before running commands.
- **`--legacy-peer-deps` required**: `npm install` needs the `--legacy-peer-deps` flag due to peer dependency conflicts between React 18 and some packages.
- **ESLint 9 / Next.js 14 mismatch**: The `next lint` command does not work because `eslint@9` is incompatible with Next.js 14's lint runner. Use `npx eslint src/` directly instead, which uses the flat config in `eslint.config.mjs`.
- **Static export mode**: `next.config.js` sets `output: 'export'`. The build produces static HTML in `/out`. API routes that use dynamic features (POST handlers) are stripped during build — this is expected.
- **Netlify Functions**: Backend API logic lives in `/netlify/functions/*.mts`. These only run in the Netlify environment or via `netlify dev`. The Next.js dev server serves the frontend only.
- **External APIs degrade gracefully**: All pages render without external API keys (Mode, Shopify, Iterable, etc.) — they show "not configured" placeholders. The Scenario Simulator works fully client-side.
- **Prisma postinstall**: `npm install` automatically runs `prisma generate` via the `postinstall` script.
- **Figma integration**: A Figma design page is available at `https://www.figma.com/design/PLP2aYtQtF5llR90LaIZca/Dan-Cursor` for content engine design work.

### Key commands

See `package.json` scripts for the full list. Key ones:
- `npm run dev` — dev server (port 3001)
- `npm run build` — production build
- `npx eslint src/` — lint (not `npm run lint`)
- `npx prisma db push` — sync schema to DB
- `npx prisma studio` — DB GUI
