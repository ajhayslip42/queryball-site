"""
QueryBall — weekly data refresh.

Pulls play-by-play, weekly player stats, roster info, and schedules from the
nflverse releases and writes parquet files into ../public/data/, where the
front-end's DuckDB-WASM layer loads them.

Run from the project root:

    cd queryball-site
    pip install nfl_data_py pyarrow pandas        # one time
    python scripts/refresh-data.py

WHY TWO SEASON RANGES?
----------------------
The weekly / players / games tables are small (a few MB even for a decade),
so we pull them for the full history. Play-by-play is ~50k plays PER SEASON
and is what powers the situational slicers (down, distance, score, etc.). A
full decade of PBP is large enough to be slow in the browser AND to bump into
Cloudflare's per-file static-asset limit, so by default we only ship recent
seasons of PBP. Widen --pbp-years when you want deeper situational history.

    python scripts/refresh-data.py --years 2015-2025 --pbp-years 2023-2025

Other flags:
    --output public/data          where the parquet files are written
    --skip pbp,weekly,players,games   skip steps you don't need this run
    --cache-dir .cache/nflverse   raw nflverse files cached between runs
"""

from __future__ import annotations
import argparse
import sys
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("Missing dependency: pandas")
    print("Install with:  pip install pandas pyarrow")
    sys.exit(1)


def _nfl():
    """Lazily import nfl_data_py — only needed when downloading, not when
    converting local CSVs. Keeps the CSV path dependency-light."""
    try:
        import nfl_data_py as nfl
        return nfl
    except ImportError:
        print("This step needs nfl_data_py.  Install with:")
        print("  pip install nfl_data_py")
        print("(Not needed if you only use --pbp-csv-dir for local CSVs.)")
        sys.exit(1)


# ---------------------------------------------------------------------------
# Play-by-play columns. nflverse PBP has 370+ columns; we trim to what the
# slicers in src/lib/slicers.ts use, plus the fields the charts need. Any
# column not present in a given season is dropped automatically.
# ---------------------------------------------------------------------------
PBP_COLS = [
    "game_id", "play_id", "season", "season_type", "week", "game_date",
    "home_team", "away_team", "posteam", "defteam", "posteam_type",
    "qtr", "down", "ydstogo", "yardline_100", "drive", "goal_to_go",
    "score_differential", "half_seconds_remaining", "game_seconds_remaining",
    "play_type", "shotgun", "no_huddle", "qb_dropback", "qb_scramble",
    "pass_attempt", "rush_attempt", "sack", "qb_hit", "complete_pass",
    "incomplete_pass", "interception", "fumble_lost", "touchdown",
    "pass_touchdown", "rush_touchdown", "first_down",
    "passer_player_id", "passer_player_name",
    "receiver_player_id", "receiver_player_name",
    "rusher_player_id", "rusher_player_name",
    "passing_yards", "receiving_yards", "rushing_yards",
    "yards_gained", "air_yards", "yards_after_catch",
    "pass_location", "pass_length", "run_location", "run_gap",
    "epa", "wpa", "success", "cpoe", "xyac_epa",
    "stadium", "roof", "surface", "temp", "wind",
    "spread_line", "total_line",
]

# Weekly player-stat columns we keep. Verified against the nflverse
# player_stats release schema. The front-end leaderboards / fantasy / share
# metrics all come from these.
WEEKLY_COLS = [
    "player_id", "player_name", "player_display_name", "position",
    "position_group", "recent_team", "season", "week", "season_type",
    "opponent_team",
    # passing
    "completions", "attempts", "passing_yards", "passing_tds",
    "interceptions", "sacks", "sack_yards", "passing_air_yards",
    "passing_yards_after_catch", "passing_first_downs", "passing_epa",
    "pacr", "dakota",
    # rushing
    "carries", "rushing_yards", "rushing_tds", "rushing_first_downs",
    "rushing_epa", "rushing_fumbles_lost",
    # receiving
    "receptions", "targets", "receiving_yards", "receiving_tds",
    "receiving_air_yards", "receiving_yards_after_catch",
    "receiving_first_downs", "receiving_epa", "racr",
    "target_share", "air_yards_share", "wopr",
    # fantasy
    "fantasy_points", "fantasy_points_ppr",
]

PLAYER_COLS = [
    "gsis_id", "display_name", "first_name", "last_name", "position",
    "position_group", "team_abbr", "jersey_number", "status",
    "height", "weight", "college_name", "rookie_year", "entry_year",
    "headshot",
]


def parse_year_range(spec: str) -> list[int]:
    """Accept '2023', '2023-2025', or '2018 2019 2020' style input."""
    spec = spec.strip()
    if "-" in spec and " " not in spec:
        lo, hi = spec.split("-")
        return list(range(int(lo), int(hi) + 1))
    return [int(x) for x in spec.replace(",", " ").split()]


def fetch_and_write_pbp(years: list[int], cache_dir: Path, output: Path,
                        csv_dir: Path | None = None) -> list[float]:
    """Write ONE slimmed parquet PER SEASON of play-by-play.

    If csv_dir is given, read existing play_by_play_{year}.csv files from there
    (reusing data you already have — no download). Otherwise fetch from nflverse.

    Per-season files keep each asset well under Cloudflare's 25 MiB limit and
    let DuckDB load only the seasons a query needs. Returns written sizes (MB).
    """
    src = f"local CSVs in {csv_dir}" if csv_dir else "nflverse download"
    print(f"  ↓ play-by-play  ({years[0]}–{years[-1]}, {len(years)} season(s)) — {src}")
    cache_dir.mkdir(parents=True, exist_ok=True)
    output.mkdir(parents=True, exist_ok=True)
    sizes, written = [], []
    for y in years:
        try:
            if csv_dir:
                csv_path = csv_dir / f"play_by_play_{y}.csv"
                if not csv_path.exists():
                    print(f"    !! no file: {csv_path.name} — skipping {y}")
                    continue
                print(f"    reading:      {csv_path.name}")
                # low_memory=False avoids dtype guessing warnings on wide files
                df = pd.read_csv(csv_path, low_memory=False)
            else:
                cache_file = cache_dir / f"pbp_{y}.parquet"
                if cache_file.exists():
                    print(f"    using cache:  {cache_file.name}")
                    df = pd.read_parquet(cache_file)
                else:
                    print(f"    fetching:     {y}")
                    df = _nfl().import_pbp_data([y], downcast=True, cache=False)
                    df.to_parquet(cache_file, index=False)
        except Exception as e:
            print(f"    !! skipped {y}: {e}")
            continue
        if "season_type" in df.columns:
            df = df[df["season_type"].isin(["REG", "POST"])]
        keep = [c for c in PBP_COLS if c in df.columns]
        df = df[keep]
        target = output / f"plays_{y}.parquet"
        df.to_parquet(target, index=False, compression="zstd")
        mb = target.stat().st_size / (1024 * 1024)
        flag = "  ⚠ over 24 MB" if mb > 24 else ""
        print(f"    wrote {target.name:<20} {len(df):>10,} rows · {mb:>6.1f} MB{flag}")
        sizes.append(mb)
        written.append(y)
    if written:
        manifest = output / "plays_manifest.json"
        manifest.write_text("{\"seasons\": [" + ",".join(str(y) for y in written) + "]}")
        print(f"    wrote {manifest.name:<20} seasons: {written}")
    return sizes


def fetch_weekly(years: list[int]) -> pd.DataFrame:
    print("  ↓ weekly player stats")
    frames = []
    for y in years:
        try:
            frames.append(_nfl().import_weekly_data([y], downcast=True))
        except Exception as e:
            print(f"    !! skipped {y}: {e}")
    if not frames:
        return pd.DataFrame()
    wk = pd.concat(frames, ignore_index=True)
    keep = [c for c in WEEKLY_COLS if c in wk.columns]
    return wk[keep]


def fetch_players() -> pd.DataFrame:
    print("  ↓ player roster info")
    try:
        pl = _nfl().import_players()
    except Exception as e:
        print(f"    !! players failed: {e}")
        return pd.DataFrame()
    keep = [c for c in PLAYER_COLS if c in pl.columns]
    return pl[keep] if keep else pl


def fetch_games(years: list[int]) -> pd.DataFrame:
    print("  ↓ schedules / game results")
    try:
        return _nfl().import_schedules(years)
    except Exception as e:
        print(f"    !! schedules failed: {e}")
        return pd.DataFrame()


def write_parquet(df: pd.DataFrame, out: Path, name: str):
    if df.empty:
        print(f"    (no rows for {name}, skipping write)")
        return
    target = out / f"{name}.parquet"
    target.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(target, index=False, compression="zstd")
    size_mb = target.stat().st_size / (1024 * 1024)
    flag = "  ⚠ large — see deploy note below" if size_mb > 24 else ""
    print(f"    wrote {target.name:<20} {len(df):>10,} rows · {size_mb:>6.1f} MB{flag}")
    return size_mb


def main():
    p = argparse.ArgumentParser(description="QueryBall data refresh")
    p.add_argument("--years", default="2015-2025",
                   help="Seasons for weekly/players/games (default 2015-2025)")
    p.add_argument("--pbp-years", default="2023-2025",
                   help="Seasons for play-by-play — keep this narrow (default 2023-2025)")
    p.add_argument("--pbp-csv-dir", default="",
                   help="Folder of existing play_by_play_{year}.csv files to reuse "
                        "instead of downloading (e.g. your local nflverse dump)")
    p.add_argument("--output", default="public/data")
    p.add_argument("--skip", default="")
    p.add_argument("--cache-dir", default=".cache/nflverse")
    args = p.parse_args()

    skip = {s.strip() for s in args.skip.split(",") if s.strip()}
    years = parse_year_range(args.years)
    pbp_years = parse_year_range(args.pbp_years)
    output = Path(args.output).resolve()
    cache = Path(args.cache_dir).resolve()

    print(f"QueryBall refresh — output → {output}\n")
    sizes = {}

    if "weekly" not in skip:
        sizes["player_week"] = write_parquet(fetch_weekly(years), output, "player_week")
    if "players" not in skip:
        sizes["players"] = write_parquet(fetch_players(), output, "players")
    if "games" not in skip:
        sizes["games"] = write_parquet(fetch_games(years), output, "games")
    if "pbp" not in skip:
        csv_dir = Path(args.pbp_csv_dir).resolve() if args.pbp_csv_dir else None
        pbp_sizes = fetch_and_write_pbp(pbp_years, cache, output, csv_dir)
        if pbp_sizes:
            sizes["plays (largest season)"] = max(pbp_sizes)

    print("\nDone.\n")

    # Explicit checklist of what landed in the output folder.
    expected = ["player_week.parquet", "players.parquet", "games.parquet"]
    print("File checklist (in {}):".format(output))
    for name in expected:
        ok = (output / name).exists()
        print(f"   [{'x' if ok else ' '}] {name}")
    season_files = sorted(output.glob("plays_*.parquet"))
    if season_files:
        for f in season_files:
            print(f"   [x] {f.name}")
    else:
        print("   [ ] plays_<year>.parquet  (none written)")
    print()

    big = [k for k, v in sizes.items() if v and v > 24]
    if big:
        print("DEPLOY NOTE")
        print("  Cloudflare static assets cap individual files at 25 MiB.")
        print(f"  These exceed it: {', '.join(big)}.")
        print("  Weekly/players/games should always be safe; if a single PBP")
        print("  season is too big, tell Claude and we'll slim further.\n")
    print("Next step: upload the files in public/data/ to Claude for query wiring")
    print("and validation before you push to production.")


if __name__ == "__main__":
    main()
