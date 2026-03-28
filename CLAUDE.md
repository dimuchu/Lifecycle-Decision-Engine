# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CRM Intelligence Copilot — a React + Next.js web app (deployed on Vercel) that aggregates Braze CRM data into a single cockpit view dashboard.

The app uses a backend-proxy pattern: Next.js API Routes hold the Braze API key server-side, cache responses (5-15 min TTL), and aggregate multiple Braze API calls into a single JSON payload for the frontend.

## Tech Stack

- **Frontend:** React 18 + TypeScript
- **Backend:** Next.js API Routes (App Router)
- **Charts:** Recharts
- **Hosting:** Vercel (free tier)
- **Styling:** Tailwind CSS
- **External API:** Braze REST API (read-only)

## Architecture

```
React Client → fetch('/api/braze') → Next.js API Route → Braze REST API
```

## Build Commands

```bash
npm run dev                 # local development
npm run build               # production build
npx vercel --prod           # production deploy
```

## Environment Variables

```
BRAZE_CANVAS_API_KEY=<ключ-для-канвасов>
BRAZE_SEGMENT_API_KEY=<ключ-для-сегментов>
BRAZE_REST_ENDPOINT=https://rest.fra-02.braze.eu
```

Store in `.env.local` (never commit). On Vercel, set via `vercel env add`.

## Key Braze API Constraints

- `/campaigns/data_series` has a separate rate limit of **50,000/min** — the hottest endpoint
- All other endpoints share a 250,000/hour limit
- Campaigns/canvases paginate at 100 items per page
- Only segments with `analytics_tracking_enabled: true` have data_series
- Open rate = `sum(unique_opens) / sum(sent)`, click rate = `sum(unique_clicks) / sum(sent)` (email only)

## Braze MCP Integration

A Braze MCP server is configured in this environment providing read-only access to campaigns, canvases, segments, events, custom attributes, KPI series, content blocks, email templates, catalogs, and scheduled broadcasts. Preference centers and CDI integrations are restricted (403). See `docs/MCP.md` for the full function matrix and access verification details.

## Project Roadmap (Contours)

1. **Contour 1 (current):** Live Dashboard — KPI cards, trend charts, campaign leaderboard, canvas comparison, segment health
2. **Friday 2:** AI Summary — Claude API generates weekly CRM brief from snapshot data
3. **Friday 3:** Hypotheses — Claude identifies anomalies and suggests A/B tests
4. **Friday 4:** Shareable view — URL parameters for date range/tag filtering

## Documentation

- `docs/CRM_Copilot_Contour1_Spec.md` — Full Contour 1 specification
- `docs/MCP.md` — Braze MCP function inventory and access verification results

## Language Note

Documentation is written in Russian. The codebase uses English for code, variable names, and comments.
