---
title: Welcome to the new QueryBall
date: 2026-01-15
tag: Site
author: Andrew Hayslip
excerpt: A rebuild from the ground up. Same thesis, fresh stack — and now position-aware so a quarterback view and a wide-receiver view look like the different jobs they are.
---

For the last few seasons, QueryBall has lived inside an embedded Power BI report. It got the job done. It also limited every interaction to the things Power BI happens to be good at — fast filtering, slow loading, no way to deep-link, no way to write.

This is the rebuild.

## What's actually different

- **Nine rollup decks**, each with five reports. Same slicers across the whole deck so you can pin a context and click between reports without losing it.
- **Position-aware Single Player view.** Pick Patrick Mahomes, the view shapes itself for a quarterback. Pick Justin Jefferson, the same deck reshapes for a wide receiver — different KPIs, different charts, different fantasy breakdown.
- **A fantasy tab on every deck**, kept separate from the football tabs. Fantasy points are derivative. They belong in their own report, not woven through every chart.
- **47 slicers** spanning time, position, team, opponent, location, down, distance, score, field zone, quarter, two-minute, formation, personnel, play type, weather, surface, pressure, play-action, air-yards bucket, run gap, Vegas spread, and total.
- **Deep-linkable views.** Every filter is in the URL. Share a slice with a teammate, they see exactly what you see.
- **A projections page**, refreshed alongside the data. Model outputs as raw .xlsx, sortable and downloadable so you can use them in your own workflow.

## Why position-aware matters

A quarterback's job is barely the same sport as a running back's. Asking "how good was Patrick Mahomes last week" needs CPOE, pressure-to-sack, third-down conversion, red-zone passing. Asking "how good was Saquon Barkley last week" needs yards before contact, broken-tackle rate, goal-line carries, third-down receiving work. Forcing both into the same dashboard either dilutes the QB view with stats that don't matter, or hides the RB view behind stats that don't apply.

So the decks fork. The player picker on Single Player stays continuous — type any name, jump to that player — but the view that loads is the one that's actually built for their position.

## What's coming

Articles like this one, weekly. Each anchored to a specific slice — a question the decks couldn't answer in one glance, walked through end to end. The site is the lab; the writing shows the work.

Glad you're here.
