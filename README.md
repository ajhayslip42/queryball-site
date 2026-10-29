# QueryBall

> Outputs without context are bar trivia. Context leads to understanding. Understanding leads to action.

QueryBall is a custom NFL stats site: six rollup decks with five reports each,
under 47+ slicers, with a dedicated fantasy tab on every deck, a weekly
projections page, a Studio (pick rows and metrics, get a table), a query
gallery, and the weekly team report PDFs. On phones the decks use a
report-first shell: a sticky context bar, a bottom filter sheet with Simple/Pro
modes and one-tap Situations, a contents screen per deck, and swipe-to-move
between reports. Desktop keeps the slicer rail. Built on Vite + React + DuckDB-WASM so the entire stack runs
in the browser — no backend to operate, no database to host.

## Quick start

```bash
# install dependencies
npm install

# start the dev server
npm run dev
# → opens at http://localhost:5173
```

## Project structure

```
queryball-site/
├── index.html
├── package.json
├── tailwind.config.js, postcss.config.js, vite.config.ts, tsconfig.json
├── public/
│   ├── logo.png            ← brand asset
│   ├── favicon.png
│   ├── data/               ← parquet files written by scripts/refresh-data.py
│   │   ├── plays.parquet
│   │   ├── player_week.parquet
│   │   ├── players.parquet
│   │   └── games.parquet
│   └── projections.xlsx    ← drop your weekly model output here
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles/globals.css  ← Tailwind base + filter-rail, tab-pill, chip styles
│   ├── lib/
│   │   ├── slicers.ts      ← URL-backed filter state, 26 dimensions (+ baseline/situational helpers)
│   │   ├── situations.ts   ← one-tap filter bundles ("Trailing", "3rd & long", …)
│   │   ├── ask.ts          ← "Ask a question" phrase dictionary → filter patch
│   │   ├── studio.ts       ← Studio dimensions, metric library, SQL builder
│   │   ├── reportMeta.ts   ← the question each report answers (mobile contents screen)
│   │   ├── useMatchCount.ts← live "N plays match" for the filter sheet
│   │   ├── nfl.ts          ← team list, color tokens, formatters, headshot/logo URLs
│   │   ├── db.ts           ← DuckDB-WASM wrapper
│   │   ├── useQuery.ts
│   │   └── articles.ts     ← Markdown loader
│   ├── components/
│   │   ├── mobile/         ← phone shell: ContextBar, FilterSheet, Pickers, BottomNav,
│   │   │                      DeckContents (+ReportPager), SituationsPanel, AskBox, Share
│   │   ├── Header.tsx, Footer.tsx
│   │   ├── SlicerPanel.tsx ← the filter rail (iteration 3 differentiated styling)
│   │   ├── DataTable.tsx
│   │   ├── deck/DeckShell.tsx  ← multi-tab framework + pill tabs
│   │   └── charts/Charts.tsx   ← Recharts wrappers, fixed heights
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Articles.tsx, Article.tsx
│   │   ├── Studio.tsx, Gallery.tsx   ← pivot builder + saved/curated queries
│   │   ├── WeeklyReports.tsx         ← team report PDFs (reads public/reports/manifest.json)
│   │   ├── Projections.tsx
│   │   ├── NotFound.tsx
│   │   └── decks/
│   │       ├── SinglePlayerDeck.tsx    ← reference deck, all 5 tabs built out
│   │       ├── TeamPlayerDeck.tsx
│   │       ├── LeagueProductionDeck.tsx
│   │       ├── TeamDefenseDeck.tsx
│   │       ├── TeamTendenciesDeck.tsx
│   │       └── LeagueDefenseDeck.tsx
│   └── content/
│       ├── articles/                   ← drop .md files here, they auto-appear
│       │   ├── welcome.md
│       │   └── third-down-myth.md
│       ├── article-template.md         ← copy this to start a new article
│       └── gallery.json                ← curated Studio queries shown in /gallery
├── public/reports/                     ← published team report PDFs + manifest.json
├── worker/index.ts                     ← OPTIONAL model fallback for the Ask box (not wired)
└── scripts/
    ├── refresh-data.py    ← run weekly; pulls nflverse → public/data/*.parquet
    ├── publish-reports.py ← shrink + copy weekly team PDFs into public/reports
    └── README.md
```

## Common tasks

| What | How |
|---|---|
| Add a new article | Drop a `.md` file in `src/content/articles/`. Frontmatter: `title, date, tag, author, excerpt`. |
| Update projections | Replace `public/projections.xlsx` with your latest model output. |
| Refresh stats data | `python scripts/refresh-data.py` (writes parquet files into `public/data/`) |
| Publish weekly team PDFs | `python scripts/publish-reports.py <folder of PDFs>` then redeploy. Needs `pip install pymupdf` for compression. |
| Add a curated Studio query | Build it in `/studio`, copy the link, paste the part after `?` into `src/content/gallery.json`. |
| Add a Situation | Append to `SITUATIONS` in `src/lib/situations.ts`. |
| Add a Studio metric or dimension | Append to `METRICS` / `DIMS` in `src/lib/studio.ts`. |
| Turn on the Ask box model fallback | See `worker/index.ts` header and the owner guide. Off by default; no cost until enabled. |
| Adjust palette | Edit the color tokens in `tailwind.config.js` and `src/styles/globals.css`. |
| Add a slicer | Add a field to `Slicers` in `src/lib/slicers.ts`, then expose it in `SlicerPanel.tsx`. |
| Add a deck or tab | Copy the structure of `SinglePlayerDeck.tsx`; routes live in `src/App.tsx`. |

## Iteration 3 design notes

The visual identity rests on a logo-derived palette: steel-blue
`#6191A5` accent, deep navy `#2A3B47` for emphasis. Three intentional design
choices distinguish the iteration-3 build:

1. **Filter rail.** Sits in a `.filter-rail` container with a cool-grey gradient
   background and a steel-blue-to-navy spine on the left edge. Visually
   distinct from the report area beside it — no chance of confusing where the
   filters end and the analysis begins.
2. **Tab strip.** Bold pill design with active-color fills, numbered chips,
   and a `"N REPORTS · IN THIS DECK → SWITCH TABS BELOW"` banner above. Tabs
   used to be subtle underlines that didn't draw the eye; they pop now.
3. **Fantasy isolation.** All fantasy-scoring content lives on a single
   dedicated tab per deck (Tab 05), marked with an `FF` badge and a distinct
   navy color. The other four tabs are football-only — no fantasy points
   anywhere in them.

## Build & deploy

```bash
npm run build
# → produces dist/ — static files, ready for any static host
```

The recommended deploy target is Cloudflare Pages — it builds from a GitHub
repo on every push and is free for this traffic level. See
`QueryBall-Setup-Instructions.pdf` for the full walkthrough.

## License

Proprietary. © Andrew Hayslip / QueryBall.
