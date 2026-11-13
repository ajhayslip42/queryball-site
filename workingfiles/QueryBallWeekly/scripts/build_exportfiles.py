#!/usr/bin/env python3
"""
build_exportfiles.py - rebuild the Report Base File's source workbook from nflverse.

Writes <season>export.xlsx (one sheet, named "Export", 54 columns) into the folder
the workbook's Power Query reads:

    C:\\Users\\ajhay\\Not_Analytics\\Queryball - Master Data Repository\\WeeklyReport\\ExportFiles

The whole season is rebuilt every time, so there is no appending, no pasting and no
chance of a duplicated or half-pasted week. Refreshing the workbook picks it up.

Usage:
    python build_exportfiles.py --out-dir "C:/Users/ajhay/Not_Analytics/Queryball - Master Data Repository/WeeklyReport/ExportFiles"
    python build_exportfiles.py --out-dir . --season 2026
    python build_exportfiles.py --out-dir . --allow-partial-ftn     # include weeks FTN hasn't finished charting

Exit codes: 0 wrote a file, 3 nothing new to write, 1 error.
It prints  WEEK=<n>  as its last line so a calling script can read the week it built through.
"""
import argparse, datetime as dt, io, sys, urllib.request
from pathlib import Path

import numpy as np
import pandas as pd

REL = "https://github.com/nflverse/nflverse-data/releases/download"
PBP = REL + "/pbp/play_by_play_{season}.parquet"
FTN = REL + "/ftn_charting/ftn_charting_{season}.parquet"

HDR = ['Source.Name','Team Full Name','season','week','Pass Attempts','Passing Yds','Completions',
'Interceptions','Pass Air Yds/Att','Passing Air Yds (all att)','Passing Air Yards (incompletions)',
'Passing Air Yards (completions only)','Pass Att at or Past the Sticks','Endzone Pass Atts',
'Passing - Avg YAC','Passing 1Ds','Passing TDs','Passing YAC','Sacks Taken','Carries','Rushing Yards',
'Rush Yds/Att','Rushing 1Ds','Rushing TDs','Explosive Carries >14','Explosive Carry %',
'Bad Carries <2yds','Bad Carry %','defteam','qtr','down','Total Passing Plays','rush',
'score_differential','Average of ydstogo','Run_Direction','Pass_Location.1','air_yards',
'n_pass_rushers','yardline_100','n_defense_box','Avg PlayClock at Snap','goal_to_go','starting_hash',
'is_motion','is_no_huddle','is_play_action','n_offense_backfield','shotgun','is_qb_out_of_pocket',
'qb_hit','qb_scramble','PlayAction/Screen/RPO','Success']

FULL = {'ARI':'Arizona Cardinals','ATL':'Atlanta Falcons','BAL':'Baltimore Ravens','BUF':'Buffalo Bills',
'CAR':'Carolina Panthers','CHI':'Chicago Bears','CIN':'Cincinnati Bengals','CLE':'Cleveland Browns',
'DAL':'Dallas Cowboys','DEN':'Denver Broncos','DET':'Detroit Lions','GB':'Green Bay Packers',
'HOU':'Houston Texans','IND':'Indianapolis Colts','JAX':'Jacksonville Jaguars','KC':'Kansas City Chiefs',
'LV':'Las Vegas Raiders','LAC':'Los Angeles Chargers','LAR':'Los Angeles Rams','MIA':'Miami Dolphins',
'MIN':'Minnesota Vikings','NE':'New England Patriots','NO':'New Orleans Saints','NYG':'New York Giants',
'NYJ':'New York Jets','PHI':'Philadelphia Eagles','PIT':'Pittsburgh Steelers','SF':'San Francisco 49ers',
'SEA':'Seattle Seahawks','TB':'Tampa Bay Buccaneers','TEN':'Tennessee Titans','WAS':'Washington Commanders'}
FULL['LA'] = FULL['LAR']; FULL['OAK'] = FULL['LV']; FULL['SD'] = FULL['LAC']; FULL['STL'] = FULL['LAR']
HASH = {'L': 'Left', 'M': 'Middle', 'R': 'Right'}


def default_season(today=None):
    d = today or dt.date.today()
    return d.year if d.month >= 8 else d.year - 1


def grab(url, tries=3):
    last = None
    for _ in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                return pd.read_parquet(io.BytesIO(r.read()))
        except Exception as e:           # noqa: BLE001
            last = e
    raise SystemExit(f"could not download {url}\n  {last}")


def complete_weeks(pbp, ftn, allow_partial_ftn):
    """Weeks where every game has reached Q4, and (unless overridden) every game is FTN-charted."""
    reg = pbp[pbp["season_type"] == "REG"]
    charted = set(ftn["nflverse_game_id"].unique()) if len(ftn) else set()
    good, notes = [], []
    for wk, g in reg.groupby("week"):
        ids = sorted(g["game_id"].unique())
        unfinished = [i for i in ids if g.loc[g.game_id == i, "qtr"].max() < 4]
        uncharted = [i for i in ids if i not in charted]
        if unfinished:
            notes.append(f"  week {wk:>2}: SKIPPED - {len(unfinished)} game(s) still in progress")
            continue
        if uncharted and not allow_partial_ftn:
            notes.append(f"  week {wk:>2}: SKIPPED - FTN has not charted {', '.join(uncharted)}"
                         f"  (rerun with --allow-partial-ftn to include it)")
            continue
        if uncharted:
            notes.append(f"  week {wk:>2}: included, but FTN has not charted {', '.join(uncharted)}"
                         f" - box/motion/play-action read as unknown for those plays")
        else:
            notes.append(f"  week {wk:>2}: {len(ids)} games, fully charted")
        good.append(int(wk))
    return sorted(good), notes


def build(pbp, ftn, weeks, season):
    pbp = pbp[(pbp["season_type"] == "REG") & (pbp["week"].isin(weeks))
              & (pbp["play_type"].isin(["pass", "run"])) & (pbp["down"].notna())].copy()

    f = ftn.rename(columns={"nflverse_game_id": "game_id", "nflverse_play_id": "play_id"})
    keep = ['game_id','play_id','starting_hash','n_offense_backfield','n_defense_box','is_no_huddle',
            'is_motion','is_play_action','is_screen_pass','is_rpo','is_qb_out_of_pocket','n_pass_rushers']
    f = f[[c for c in keep if c in f.columns]].copy()
    f["play_id"] = f["play_id"].astype("int64")
    pbp["play_id"] = pbp["play_id"].astype("int64")
    pbp = pbp.merge(f, on=["game_id", "play_id"], how="left")

    def N(c):
        return pd.to_numeric(pbp[c], errors="coerce") if c in pbp.columns else pd.Series(np.nan, index=pbp.index)

    def B(c):
        s = pd.to_numeric(pbp[c], errors="coerce").fillna(0) if c in pbp.columns else pd.Series(0.0, index=pbp.index)
        return s.astype(float) == 1

    def S(c):
        return pbp[c].astype("object") if c in pbp.columns else pd.Series(None, index=pbp.index, dtype="object")

    nan = np.nan
    ispass = pbp["play_type"].eq("pass").to_numpy()
    isrun = pbp["play_type"].eq("run").to_numpy()
    sack = N("sack").fillna(0)
    att = (N("pass_attempt").fillna(0) == 1) & (sack == 0)      # a sack is not an attempt
    comp = (N("complete_pass").fillna(0) == 1)
    ay, yg, ytg = N("air_yards"), N("yards_gained"), N("ydstogo")
    yl100, yac = N("yardline_100"), N("yards_after_catch")

    d = pd.DataFrame(index=pbp.index)
    d['Source.Name'] = f'{season}export.xlsx'
    d['Team Full Name'] = pbp['posteam'].map(FULL)
    d['season'] = pbp['season'].astype(int)
    d['week'] = pbp['week'].astype(int)
    d['Pass Attempts'] = np.where(ispass, att.astype(int), 0)
    d['Passing Yds'] = np.where(comp, yg, nan)
    d['Completions'] = np.where(comp, 1, nan)
    d['Interceptions'] = np.where(B('interception'), 1, nan)
    d['Pass Air Yds/Att'] = np.where(att, ay, nan)
    d['Passing Air Yds (all att)'] = np.where(att, ay, nan)
    d['Passing Air Yards (incompletions)'] = np.where(att & ~comp, ay, nan)
    d['Passing Air Yards (completions only)'] = np.where(comp, ay, nan)
    d['Pass Att at or Past the Sticks'] = np.where(att, (ay >= ytg).astype(int), nan)
    d['Endzone Pass Atts'] = np.where(att, ((yl100 - ay) <= 0).astype(int), nan)
    d['Passing - Avg YAC'] = np.where(comp, yac, nan)
    d['Passing 1Ds'] = np.where(B('first_down_pass'), 1, nan)
    d['Passing TDs'] = np.where(B('pass_touchdown'), 1, nan)
    d['Passing YAC'] = np.where(comp, yac, nan)
    d['Sacks Taken'] = np.where(ispass, sack.astype(int), 0)
    d['Carries'] = np.where(isrun, 1, 0)
    d['Rushing Yards'] = np.where(isrun, yg, nan)
    d['Rush Yds/Att'] = np.where(isrun, yg, nan)
    d['Rushing 1Ds'] = np.where(B('first_down_rush'), 1, nan)
    d['Rushing TDs'] = np.where(B('rush_touchdown'), 1, nan)
    expl = np.where(isrun, (yg > 14).astype(int), nan)
    bad = np.where(isrun, (yg < 2).astype(int), nan)
    d['Explosive Carries >14'] = expl
    d['Explosive Carry %'] = expl
    d['Bad Carries <2yds'] = bad
    d['Bad Carry %'] = bad
    d['defteam'] = pbp['defteam']
    d['qtr'] = N('qtr').astype(int)
    d['down'] = N('down').astype(int)
    d['Total Passing Plays'] = np.where(ispass, 1, nan)
    d['rush'] = np.where(isrun, 1, 0)
    d['score_differential'] = N('score_differential')
    d['Average of ydstogo'] = ytg
    rl, rg = S('run_location'), S('run_gap')
    rd = rl.fillna('').astype(str) + np.where(rg.isna(), '', ' ' + rg.fillna('').astype(str))
    d['Run_Direction'] = np.where(isrun & rl.notna().to_numpy(), rd, None)
    d['Pass_Location.1'] = np.where(att, S('pass_location'), None)
    d['air_yards'] = np.where(att, ay, nan)
    d['n_pass_rushers'] = N('n_pass_rushers').fillna(0).astype(int)
    d['yardline_100'] = yl100.astype(int)
    d['n_defense_box'] = N('n_defense_box').fillna(0).astype(int)
    d['Avg PlayClock at Snap'] = 0
    d['goal_to_go'] = N('goal_to_go').fillna(0).astype(int)
    d['starting_hash'] = S('starting_hash').map(lambda v: HASH.get(v, v if pd.notna(v) else '0'))
    d['is_motion'] = B('is_motion')
    d['is_no_huddle'] = B('is_no_huddle')
    d['is_play_action'] = B('is_play_action')
    d['n_offense_backfield'] = N('n_offense_backfield').fillna(0).astype(int)
    d['shotgun'] = N('shotgun').fillna(0).astype(int)
    d['is_qb_out_of_pocket'] = B('is_qb_out_of_pocket')
    d['qb_hit'] = N('qb_hit').fillna(0).astype(int)
    d['qb_scramble'] = N('qb_scramble').fillna(0).astype(int)
    d['PlayAction/Screen/RPO'] = np.where(B('is_rpo'), 'RPO',
        np.where(B('is_screen_pass'), 'Screen',
        np.where(B('is_play_action'), 'Play-Action', None)))
    d['Success'] = (N('epa') > 0).astype(int)
    return d[HDR]


def write_xlsx(df, path):
    """Write one sheet named Export. Power Query reads the sheet by that name."""
    from openpyxl import Workbook
    from openpyxl.utils import get_column_letter
    wb = Workbook(write_only=True)
    ws = wb.create_sheet('Export')
    ws.append(list(df.columns))
    obj = df.astype(object).where(pd.notna(df), None)
    for row in obj.itertuples(index=False, name=None):
        ws.append(list(row))
    wb.save(path)
    _ = get_column_letter  # keep the import honest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out-dir', required=True, help='folder the workbook Power Query points at')
    ap.add_argument('--season', type=int, default=None)
    ap.add_argument('--allow-partial-ftn', action='store_true',
                    help='include a week even when FTN has not charted every game')
    ap.add_argument('--through-week', type=int, default=None, help='stop at this week')
    a = ap.parse_args()

    season = a.season or default_season()
    out_dir = Path(a.out_dir)
    if not out_dir.is_dir():
        print(f"ERROR: out-dir does not exist: {out_dir}")
        return 1

    print(f"season {season}: downloading nflverse play-by-play and FTN charting")
    pbp = grab(PBP.format(season=season))
    try:
        ftn = grab(FTN.format(season=season))
    except SystemExit:
        print("  FTN charting not published for this season yet - charting columns will be blank")
        ftn = pd.DataFrame(columns=['nflverse_game_id', 'nflverse_play_id'])

    weeks, notes = complete_weeks(pbp, ftn, a.allow_partial_ftn)
    print("week status:")
    for n in notes:
        print(n)
    if a.through_week:
        weeks = [w for w in weeks if w <= a.through_week]
    if not weeks:
        print("no complete weeks yet - nothing written")
        return 3

    df = build(pbp, ftn, weeks, season)
    out = out_dir / f'{season}export.xlsx'
    tmp = out.with_suffix('.tmp.xlsx')
    write_xlsx(df, tmp)
    tmp.replace(out)

    print(f"\nwrote {out}")
    print(f"  weeks {weeks[0]}-{weeks[-1]}  |  {len(df):,} rows  |  {len(df.columns)} columns")
    print(f"  pass attempts {int(df['Pass Attempts'].sum()):,}   "
          f"completions {int(df['Completions'].sum()):,}   "
          f"carries {int(df['Carries'].sum()):,}")
    print(f"WEEK={weeks[-1]}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
