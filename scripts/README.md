# QueryBall scripts

Operational scripts for the data pipeline.

## refresh-data.py

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
