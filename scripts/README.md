# QueryBall scripts

Operational scripts for the data pipeline.

## nightly_refresh.py  ← the one that runs automatically

Every morning at 4 AM Central, the GitHub Actions workflow in
`.github/workflows/nightly-refresh.yml` runs this script on GitHub's servers,
commits any changed files in `public/data/`, and deploys the site to Cloudflare.
Nothing needs to be running at home. Setup steps are in the comments at the top
of that workflow file (two Cloudflare secrets, then press "Run workflow" once).

It pulls the nflverse release files directly (no `nfl_data_py`) and writes:

| File | What's in it |
|---|---|
| `plays_<season>.parquet` | Play-by-play, REG + POST, one file per season (2023+) |
| `player_week.parquet` | Weekly player stats, 2015+ (nflverse `stats_player_week_*`) |
| `players.parquet` | Roster metadata and headshots |
| `games.parquet` | Schedules, scores, lines, roof/surface/weather — includes future games |
| `snaps.parquet` | Snap counts, 2023+ |
| `plays_manifest.json` | Seasons list + a `version` that changes only when data changes (cache-buster) |

A file is only rewritten when its bytes actually changed, nothing is ever
deleted, and a failed download leaves the existing file untouched.

To run it by hand (same result as the nightly job, minus the commit/deploy):

```bash
pip install pandas pyarrow
python scripts/nightly_refresh.py            # auto-detects the current season
python scripts/nightly_refresh.py --dry-run  # just report what would change
```

## refresh-data.py  (legacy)

> Kept for reference. Its weekly-stats step depends on `nfl_data_py`, which
> still reads the old `player_stats_<year>` files that nflverse stopped
> updating after 2024 — so it cannot produce 2025+ weekly stats. Use
> `nightly_refresh.py` instead.

Pulls play-by-play, weekly player stats, rosters, and schedules from the
[nflverse](https://github.com/nflverse) releases and writes parquet files
into `public/data/`, which the front-end loads via DuckDB-WASM.

### One-time setup

```bash
pip install nfl_data_py pyarrow pandas
```

### Every Tuesday morning during the season

```bash
cd queryball-site
python scripts/refresh-data.py
git add public/data/ .cache/nflverse/
git commit -m "data: refresh week N"
git push
```

That's the whole loop. The deploy pipeline picks up the new parquet files on
the next push.

### Useful flags

| Flag | Default | Use case |
|---|---|---|
| `--years 2024 2025` | 2015–2025 | Only refresh recent seasons (faster) |
| `--skip pbp` | (none skipped) | Skip a step you don't need this run |
| `--output public/data` | same | Write parquet somewhere else |
| `--cache-dir .cache/nflverse` | same | Where raw nflverse files cache between runs |

### Output

After a successful run, `public/data/` contains:

| File | What's in it |
|---|---|
| `plays.parquet` | Play-by-play, 2015+ regular + postseason, slimmed to the columns the slicers use |
| `player_week.parquet` | Weekly tidy stats per player |
| `players.parquet` | Roster metadata (gsis_id, position, college, height/weight) |
| `games.parquet` | Schedules and final scores, also pulls in Vegas spread/total |

### Projections

Projections come from your own model, not from this script. Drop your weekly
xlsx file at `public/projections.xlsx` and the front-end's `/projections`
page will read it.
