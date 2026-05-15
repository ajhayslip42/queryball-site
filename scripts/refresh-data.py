"""
QueryBall — weekly data refresh.

Pulls play-by-play, weekly player stats, roster info, and schedules from
nflverse releases, filters to 2015+ regular and postseason, and writes
parquet files into ../public/data/ where the front-end's DuckDB-WASM picks
them up.

Run from the project root:
    cd queryball-site
    python scripts/refresh-data.py

Optional flags:
    --years 2018 2019 2020 2021 2022 2023 2024 2025
    --output ../public/data
    --skip pbp,weekly,players,games

First run takes a few minutes. Weekly refreshes are quicker because each
season's PBP file is cached locally between runs.
"""

from __future__ import annotations
import argparse
import sys
import os
from pathlib import Path

# nfl_data_py wraps the nflverse releases and gives us tidy DataFrames.
# pip install nfl_data_py pyarrow pandas
try:
    import nfl_data_py as nfl
    import pandas as pd
except ImportError as e:
    print("Missing dependency:", e)
    print("Install with:  pip install nfl_data_py pyarrow pandas")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Columns we keep. nflverse PBP has 370+ columns; we trim to what the slicers
# in src/lib/slicers.ts actually use, plus a few we'll need for the charts.
# ---------------------------------------------------------------------------

PBP_COLS = [
    "game_id", "play_id", "season", "season_type", "week", "game_date",
    "home_team", "away_team", "posteam", "defteam", "posteam_type",
    "qtr", "down", "ydstogo", "yardline_100", "drive",
    "score_differential", "score_differential_post", "half_seconds_remaining",
    "play_type", "shotgun", "no_huddle", "pass_attempt", "rush_attempt",
    "sack", "qb_dropback", "qb_scramble", "qb_hit", "complete_pass",
    "incomplete_pass", "interception", "fumble_lost", "touchdown",
    "pass_touchdown", "rush_touchdown",
    "passer_player_id", "passer_player_name", "receiver_player_id",
    "receiver_player_name", "rusher_player_id", "rusher_player_name",
    "passing_yards", "receiving_yards", "rushing_yards",
    "yards_gained", "air_yards", "yards_after_catch",
    "pass_location", "pass_length", "run_location", "run_gap",
    "personnel_offense", "personnel_defense",
    "epa", "wpa", "success", "cpoe",
    "stadium", "roof", "surface", "weather", "temp", "wind",
    "spread_line", "total_line",
]


def fetch_pbp(years: list[int], cache_dir: Path) -> pd.DataFrame:
    print(f"  ↓ play-by-play  ({years[0]}–{years[-1]}, {len(years)} season(s))")
    cache_dir.mkdir(parents=True, exist_ok=True)
    frames = []
    for y in years:
        cache_file = cache_dir / f"pbp_{y}.parquet"
        if cache_file.exists():
            print(f"    using cache:  {cache_file.name}")
            df = pd.read_parquet(cache_file)
        else:
            print(f"    fetching:     {y}")
            df = nfl.import_pbp_data([y], downcast=True, cache=False)
            df.to_parquet(cache_file, index=False)
        frames.append(df)
    pbp = pd.concat(frames, ignore_index=True)
    keep = [c for c in PBP_COLS if c in pbp.columns]
    return pbp[keep]


def fetch_weekly(years: list[int]) -> pd.DataFrame:
    print(f"  ↓ weekly player stats")
    return nfl.import_weekly_data(years, downcast=True)


def fetch_players() -> pd.DataFrame:
    print(f"  ↓ player roster info")
    return nfl.import_players()


def fetch_games(years: list[int]) -> pd.DataFrame:
    print(f"  ↓ schedules / game results")
    return nfl.import_schedules(years)


def write_parquet(df: pd.DataFrame, out: Path, name: str):
    target = out / f"{name}.parquet"
    target.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(target, index=False, compression="zstd")
    size_mb = target.stat().st_size / (1024 * 1024)
    print(f"    wrote {target.name:<22} {len(df):>10,} rows · {size_mb:>6.1f} MB")


def main():
    parser = argparse.ArgumentParser(description="QueryBall data refresh")
    parser.add_argument("--years", nargs="+", type=int,
        default=list(range(2015, 2026)),
        help="Seasons to fetch (default 2015–2025)")
    parser.add_argument("--output", default="public/data",
        help="Where to write parquet files (relative to project root)")
    parser.add_argument("--skip", default="",
        help="Comma-separated steps to skip: pbp,weekly,players,games")
    parser.add_argument("--cache-dir", default=".cache/nflverse",
        help="Where to cache raw nflverse PBP files between runs")
    args = parser.parse_args()

    skip = {s.strip() for s in args.skip.split(",") if s.strip()}
    output = Path(args.output).resolve()
    cache = Path(args.cache_dir).resolve()

    print(f"QueryBall refresh — output → {output}")
    print()

    if "pbp" not in skip:
        pbp = fetch_pbp(args.years, cache)
        # Filter to regular + postseason only (no preseason)
        pbp = pbp[pbp["season_type"].isin(["REG", "POST"])]
        write_parquet(pbp, output, "plays")

    if "weekly" not in skip:
        wk = fetch_weekly(args.years)
        write_parquet(wk, output, "player_week")

    if "players" not in skip:
        pl = fetch_players()
        write_parquet(pl, output, "players")

    if "games" not in skip:
        gm = fetch_games(args.years)
        write_parquet(gm, output, "games")

    print()
    print("Done. Files are now available to the React app at /data/<name>.parquet.")
    print()
    print("To deploy: commit the updated parquet files and push.")


if __name__ == "__main__":
    main()
