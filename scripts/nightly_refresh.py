#!/usr/bin/env python3
"""
QueryBall — nightly data refresh.

Pulls the current nflverse release files straight from GitHub (no nfl_data_py —
that library still points at the old `player_stats_<year>` files, which nflverse
stopped updating after 2024) and rebuilds the parquet files in public/data/ that
the site's DuckDB-WASM layer loads:

    plays_<season>.parquet   play-by-play, REG + POST, trimmed to the slicer columns
    player_week.parquet      weekly player stats (nflverse stats_player_week_*)
    players.parquet          roster / headshot metadata
    games.parquet            schedules, scores, lines, roof/surface/weather
    snaps.parquet            offense/defense/ST snap counts (optional view)
    plays_manifest.json      {"seasons": [...], "version": "<season>w<week>-<hash>"}

Rules the script follows so it is safe to run unattended:
  * A file is only replaced when its bytes actually changed. Nothing is deleted.
  * If a download fails, the existing file is left exactly as it was.
  * The newest season may not exist yet (Aug/early Sep) — that is a skip, not an error.
  * The manifest version only changes when some data file changed, so browser and
    edge caches are busted exactly when they need to be and never otherwise.
  * When run inside GitHub Actions it writes `changed=` and `version=` to $GITHUB_OUTPUT
    so the workflow knows whether to commit and deploy.

Usage (from the repo root):
    pip install pandas pyarrow
    python scripts/nightly_refresh.py                 # auto-detects the current season
    python scripts/nightly_refresh.py --through 2026  # force the newest season
    python scripts/nightly_refresh.py --dry-run       # show what would change, write nothing
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import io
import json
import os
import sys
import tempfile
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

try:
    import pandas as pd
    import pyarrow.parquet as pq
except ImportError:
    print("Missing dependency. Install with:  pip install pandas pyarrow")
    sys.exit(1)

BASE = "https://github.com/nflverse/nflverse-data/releases/download"
UA = "queryball-nightly-refresh (+https://queryball.com)"

# ---------------------------------------------------------------------------
# Column lists. These match the files the site already ships, column for column
# (plus a few extras on player_week/players that newer pages can use). Any column
# missing from a given nflverse season is dropped automatically.
# ---------------------------------------------------------------------------
PBP_COLS = [
    "game_id", "play_id", "season", "season_type", "week", "game_date",
    "home_team", "away_team", "posteam", "defteam", "posteam_type",
    "qtr", "down", "ydstogo", "yardline_100", "drive", "goal_to_go",
    "score_differential", "half_seconds_remaining", "game_seconds_remaining",
    "play_type", "shotgun", "no_huddle", "qb_dropback", "qb_scramble",
    "play_action", "qb_hit",
    "pass_attempt", "rush_attempt", "sack", "complete_pass",
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

# nflverse renamed a few weekly-stat columns in 2025; the site uses the old names.
WEEKLY_RENAMES = {
    "team": "recent_team",
    "passing_interceptions": "interceptions",
    "sacks_suffered": "sacks",
    "sack_yards_lost": "sack_yards",
}
WEEKLY_COLS = [
    # — the 24 columns the site has always shipped, in the same order —
    "player_id", "player_display_name", "player_name", "position", "position_group",
    "recent_team", "opponent_team", "season", "week", "season_type", "game_id",
    "completions", "attempts", "passing_yards", "passing_tds",
    "carries", "rushing_yards", "rushing_tds",
    "targets", "receptions", "receiving_yards", "receiving_tds",
    "fantasy_points", "fantasy_points_ppr",
    # — extras (harmless superset) —
    "interceptions", "sacks", "sack_yards", "passing_air_yards",
    "passing_yards_after_catch", "passing_first_downs", "passing_epa", "pacr",
    "rushing_first_downs", "rushing_epa", "rushing_fumbles_lost",
    "receiving_air_yards", "receiving_yards_after_catch", "receiving_first_downs",
    "receiving_epa", "racr", "target_share", "air_yards_share", "wopr",
]

PLAYER_COLS = [
    "gsis_id", "display_name", "short_name", "football_name", "position",
    "position_group", "headshot", "jersey_number", "height", "weight", "status",
    "latest_team", "last_season",
    # extras
    "first_name", "last_name", "college_name", "rookie_season",
    "years_of_experience", "birth_date", "draft_year", "draft_round", "draft_pick",
]

SNAP_COLS = [
    "game_id", "season", "game_type", "week", "player", "pfr_player_id",
    "position", "team", "opponent",
    "offense_snaps", "offense_pct", "defense_snaps", "defense_pct", "st_snaps", "st_pct",
]


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def current_season(today: dt.date | None = None) -> int:
    """NFL season label: Aug–Dec → this year, Jan–Jul → last year (playoffs/offseason)."""
    today = today or dt.date.today()
    return today.year if today.month >= 8 else today.year - 1


def download(rel_path: str, dest_dir: Path, attempts: int = 3) -> Path | None:
    """Download one release asset. Returns None on 404 (asset not published yet).
    Raises on repeated non-404 failures so callers can keep the existing file."""
    url = f"{BASE}/{rel_path}"
    dest = dest_dir / Path(rel_path).name
    last_err: Exception | None = None
    for i in range(attempts):
        try:
            req = Request(url, headers={"User-Agent": UA})
            with urlopen(req, timeout=120) as r, open(dest, "wb") as f:
                while True:
                    chunk = r.read(1 << 20)
                    if not chunk:
                        break
                    f.write(chunk)
            return dest
        except HTTPError as e:
            if e.code == 404:
                return None
            last_err = e
        except (URLError, TimeoutError, OSError) as e:
            last_err = e
        time.sleep(3 * (i + 1))
    raise RuntimeError(f"download failed after {attempts} attempts: {url} ({last_err})")


def read_cols(path: Path, wanted: list[str], renames: dict[str, str] | None = None) -> pd.DataFrame:
    """Read only the columns we keep (fast, low memory), applying renames first."""
    renames = renames or {}
    have = set(pq.read_schema(path).names)
    inv = {v: k for k, v in renames.items()}  # site name -> nflverse source name
    src_cols = []
    for c in wanted:
        src = inv.get(c, c)
        if src in have:
            src_cols.append(src)
    df = pd.read_parquet(path, columns=src_cols)
    if renames:
        df = df.rename(columns=renames)
    return df[[c for c in wanted if c in df.columns]]


def to_parquet_bytes(df: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    df.to_parquet(buf, index=False, compression="zstd")
    return buf.getvalue()


class Output:
    """Writes files only when bytes changed; tracks what happened for the summary."""

    def __init__(self, folder: Path, dry_run: bool):
        self.folder = folder
        self.dry_run = dry_run
        self.changed: list[str] = []
        self.unchanged: list[str] = []
        self.skipped: list[str] = []
        folder.mkdir(parents=True, exist_ok=True)

    def put(self, name: str, data: bytes, note: str = ""):
        target = self.folder / name
        old = target.read_bytes() if target.exists() else None
        mb = len(data) / (1024 * 1024)
        flag = "  ⚠ over 24 MB (Cloudflare asset limit is 25 MiB)" if mb > 24 else ""
        if old == data:
            self.unchanged.append(name)
            print(f"    = {name:<24} unchanged  {mb:6.2f} MB  {note}")
            return
        self.changed.append(name)
        verb = "would write" if self.dry_run else "wrote"
        print(f"    + {name:<24} {verb:<10} {mb:6.2f} MB  {note}{flag}")
        if not self.dry_run:
            target.write_bytes(data)

    def skip(self, name: str, why: str):
        self.skipped.append(name)
        print(f"    ~ {name:<24} kept as-is — {why}")


# ---------------------------------------------------------------------------
# steps
# ---------------------------------------------------------------------------
def step_pbp(years: list[int], tmp: Path, out: Output) -> dict[int, int]:
    """One slimmed parquet per season. Returns {season: max_week} for seasons processed."""
    print(f"\n▶ play-by-play  seasons {years[0]}–{years[-1]}")
    weeks: dict[int, int] = {}
    newest = years[-1]
    for y in years:
        name = f"plays_{y}.parquet"
        try:
            src = download(f"pbp/play_by_play_{y}.parquet", tmp)
        except Exception as e:
            out.skip(name, str(e))
            continue
        if src is None:
            out.skip(name, "not published yet" if y == newest else "404 from nflverse")
            continue
        df = read_cols(src, PBP_COLS)
        if "season_type" in df.columns:
            df = df[df["season_type"].isin(["REG", "POST"])]
        if df.empty:
            out.skip(name, "no REG/POST plays yet")
            continue
        # The site UNION ALLs every season file by position, so every season must
        # have the same columns AND types. nflverse is not perfectly consistent
        # (e.g. goal_to_go is int in 2023, double in 2024+), so normalise here.
        for c in df.columns:
            if c in ("season", "week"):
                df[c] = df[c].astype("int32")
            elif pd.api.types.is_numeric_dtype(df[c]) and not pd.api.types.is_bool_dtype(df[c]):
                df[c] = df[c].astype("float64")
        weeks[y] = int(df["week"].max())
        out.put(name, to_parquet_bytes(df), f"{len(df):,} plays · through week {weeks[y]}")
        src.unlink(missing_ok=True)
    return weeks


def step_weekly(years: list[int], tmp: Path, out: Output):
    print(f"\n▶ weekly player stats  seasons {years[0]}–{years[-1]}")
    frames = []
    newest = years[-1]
    for y in years:
        try:
            src = download(f"stats_player/stats_player_week_{y}.parquet", tmp)
        except Exception as e:
            out.skip("player_week.parquet", f"season {y} failed to download ({e})")
            return
        if src is None:
            if y == newest:
                print(f"    · {y}: not published yet")
                continue
            out.skip("player_week.parquet", f"season {y} returned 404 — refusing to rebuild without it")
            return
        frames.append(read_cols(src, WEEKLY_COLS, WEEKLY_RENAMES))
        src.unlink(missing_ok=True)
    if not frames:
        out.skip("player_week.parquet", "nothing downloaded")
        return
    wk = pd.concat(frames, ignore_index=True)
    wk = wk[[c for c in WEEKLY_COLS if c in wk.columns]]
    out.put("player_week.parquet", to_parquet_bytes(wk), f"{len(wk):,} player-weeks")


def step_players(tmp: Path, out: Output):
    print("\n▶ players")
    try:
        src = download("players/players.parquet", tmp)
    except Exception as e:
        out.skip("players.parquet", str(e))
        return
    if src is None:
        out.skip("players.parquet", "404 from nflverse")
        return
    df = read_cols(src, PLAYER_COLS)
    out.put("players.parquet", to_parquet_bytes(df), f"{len(df):,} players")
    src.unlink(missing_ok=True)


def step_games(from_year: int, tmp: Path, out: Output):
    print(f"\n▶ games / schedules  {from_year}+ (includes future games and lines)")
    try:
        src = download("schedules/games.parquet", tmp)
    except Exception as e:
        out.skip("games.parquet", str(e))
        return
    if src is None:
        out.skip("games.parquet", "404 from nflverse")
        return
    df = pd.read_parquet(src)
    df = df[df["season"] >= from_year].reset_index(drop=True)
    out.put("games.parquet", to_parquet_bytes(df), f"{len(df):,} games")
    src.unlink(missing_ok=True)


def step_snaps(years: list[int], tmp: Path, out: Output):
    print(f"\n▶ snap counts  seasons {years[0]}–{years[-1]}")
    frames = []
    newest = years[-1]
    for y in years:
        try:
            src = download(f"snap_counts/snap_counts_{y}.parquet", tmp)
        except Exception as e:
            out.skip("snaps.parquet", f"season {y} failed to download ({e})")
            return
        if src is None:
            if y == newest:
                print(f"    · {y}: not published yet")
                continue
            out.skip("snaps.parquet", f"season {y} returned 404 — refusing to rebuild without it")
            return
        frames.append(read_cols(src, SNAP_COLS))
        src.unlink(missing_ok=True)
    if not frames:
        out.skip("snaps.parquet", "nothing downloaded")
        return
    sn = pd.concat(frames, ignore_index=True)
    out.put("snaps.parquet", to_parquet_bytes(sn), f"{len(sn):,} player-games")


def step_manifest(out: Output, newest_season: int, weeks: dict[int, int]):
    print("\n▶ manifest")
    folder = out.folder
    seasons = sorted(int(p.stem.split("_")[1]) for p in folder.glob("plays_*.parquet"))
    if not seasons:
        out.skip("plays_manifest.json", "no plays_<season>.parquet files present")
        return
    # Content hash over every data file → version changes iff data changed.
    h = hashlib.sha256()
    for p in sorted(folder.glob("*.parquet")):
        h.update(p.name.encode())
        h.update(p.read_bytes())
    latest = seasons[-1]
    week = weeks.get(latest)
    if week is None:  # season not rebuilt this run — read it from the file we have
        try:
            week = int(pd.read_parquet(folder / f"plays_{latest}.parquet", columns=["week"])["week"].max())
        except Exception:
            week = 0
    version = f"{latest}w{week}-{h.hexdigest()[:8]}"
    text = json.dumps({"seasons": seasons, "version": version}, separators=(",", ":")) + "\n"
    out.put("plays_manifest.json", text.encode(), f"version {version}")
    return version


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="QueryBall nightly data refresh")
    ap.add_argument("--through", type=int, default=None,
                    help="newest season to pull (default: auto from today's date)")
    ap.add_argument("--pbp-from", type=int, default=2023,
                    help="first season of play-by-play to ship (default 2023)")
    ap.add_argument("--years-from", type=int, default=2015,
                    help="first season for weekly stats / games (default 2015)")
    ap.add_argument("--snaps-from", type=int, default=2023,
                    help="first season of snap counts (default 2023)")
    ap.add_argument("--output", default="public/data")
    ap.add_argument("--skip", default="",
                    help="comma list of steps to skip: pbp,weekly,players,games,snaps")
    ap.add_argument("--dry-run", action="store_true", help="report changes, write nothing")
    args = ap.parse_args()

    through = args.through or current_season()
    skip = {s.strip() for s in args.skip.split(",") if s.strip()}
    out = Output(Path(args.output).resolve(), args.dry_run)

    print(f"QueryBall nightly refresh — {dt.datetime.now():%Y-%m-%d %H:%M}  "
          f"season {through}  →  {out.folder}{'  (DRY RUN)' if args.dry_run else ''}")

    weeks: dict[int, int] = {}
    with tempfile.TemporaryDirectory(prefix="nflverse-") as td:
        tmp = Path(td)
        if "pbp" not in skip:
            weeks = step_pbp(list(range(args.pbp_from, through + 1)), tmp, out)
        if "weekly" not in skip:
            step_weekly(list(range(args.years_from, through + 1)), tmp, out)
        if "players" not in skip:
            step_players(tmp, out)
        if "games" not in skip:
            step_games(args.years_from, tmp, out)
        if "snaps" not in skip:
            step_snaps(list(range(args.snaps_from, through + 1)), tmp, out)

    version = "(dry run)" if args.dry_run else step_manifest(out, through, weeks)

    data_changed = [n for n in out.changed if n != "plays_manifest.json"]
    print("\n" + "─" * 64)
    print(f"changed:   {', '.join(out.changed) or 'nothing'}")
    print(f"unchanged: {len(out.unchanged)} file(s)")
    if out.skipped:
        print(f"kept as-is (download problem or not yet published): {', '.join(out.skipped)}")
    print("─" * 64)

    gh_out = os.environ.get("GITHUB_OUTPUT")
    if gh_out:
        with open(gh_out, "a") as f:
            f.write(f"changed={'true' if data_changed else 'false'}\n")
            f.write(f"version={version or ''}\n")
            f.write(f"files={' '.join(data_changed)}\n")

    # Only a total failure (every step skipped, nothing produced) is an error.
    produced = out.changed or out.unchanged
    if not produced:
        print("ERROR: no files could be produced — check network access to github.com")
        sys.exit(2)


if __name__ == "__main__":
    main()
