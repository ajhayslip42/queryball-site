#!/usr/bin/env python3
"""
prune-reports.py - make public/reports/manifest.json agree with what is on disk.

The Weekly Reports page reads manifest.json, not the folders. So deleting a week's
folder is only half the job - until the manifest is rebuilt, the page still lists
reports that 404.

Workflow for dropping a week:
    Remove-Item -Recurse -Force public\\reports\\2026\\wk2
    python scripts\\prune-reports.py

It rebuilds the manifest from the PDFs that actually exist: keeps each report's
existing name/pages/updated where it can, refreshes byte counts, picks up any PDF
that is on disk but missing from the manifest, and drops anything that is gone.

    python scripts/prune-reports.py                     # sync manifest to disk
    python scripts/prune-reports.py --drop 2026:2       # delete week 2 of 2026, then sync
    python scripts/prune-reports.py --drop 2026:2,2026:18
    python scripts/prune-reports.py --keep 2026:9       # delete every week except this one
    python scripts/prune-reports.py --list              # show what is published, change nothing
    python scripts/prune-reports.py --dry-run           # say what would change
"""
import argparse, json, re, shutil, sys
from datetime import date
from pathlib import Path

TEAMS = {
 'ARI':'Arizona Cardinals','ATL':'Atlanta Falcons','BAL':'Baltimore Ravens','BUF':'Buffalo Bills',
 'CAR':'Carolina Panthers','CHI':'Chicago Bears','CIN':'Cincinnati Bengals','CLE':'Cleveland Browns',
 'DAL':'Dallas Cowboys','DEN':'Denver Broncos','DET':'Detroit Lions','GB':'Green Bay Packers',
 'HOU':'Houston Texans','IND':'Indianapolis Colts','JAX':'Jacksonville Jaguars','KC':'Kansas City Chiefs',
 'LV':'Las Vegas Raiders','LAC':'Los Angeles Chargers','LAR':'Los Angeles Rams','MIA':'Miami Dolphins',
 'MIN':'Minnesota Vikings','NE':'New England Patriots','NO':'New Orleans Saints','NYG':'New York Giants',
 'NYJ':'New York Jets','PHI':'Philadelphia Eagles','PIT':'Pittsburgh Steelers','SF':'San Francisco 49ers',
 'SEA':'Seattle Seahawks','TB':'Tampa Bay Buccaneers','TEN':'Tennessee Titans','WAS':'Washington Commanders'}


def pages_of(p: Path):
    try:
        import pymupdf
        with pymupdf.open(str(p)) as d:
            return d.page_count
    except Exception:
        return None


def parse_spec(s):
    out = set()
    for part in s.split(','):
        part = part.strip()
        if not part:
            continue
        m = re.fullmatch(r'(\d{4})\s*:\s*(\d{1,2})', part)
        if not m:
            sys.exit(f"could not read '{part}' - use season:week, e.g. 2026:2")
        out.add((int(m.group(1)), int(m.group(2))))
    return out


def scan(root: Path):
    """every published PDF on disk -> (season, week, team) -> path"""
    found = {}
    for pdf in root.glob('*/wk*/*.pdf'):
        try:
            season = int(pdf.parent.parent.name)
            week = int(pdf.parent.name[2:])
        except ValueError:
            continue
        found[(season, week, pdf.stem.upper())] = pdf
    return found


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--reports', default='public/reports', help='published reports folder')
    ap.add_argument('--drop', default='', help='season:week pairs to delete, comma separated')
    ap.add_argument('--keep', default='', help='season:week pairs to keep - everything else is deleted')
    ap.add_argument('--list', action='store_true', help='show what is published and exit')
    ap.add_argument('--dry-run', action='store_true', help='report changes without making them')
    a = ap.parse_args()

    root = Path(a.reports)
    if not root.is_dir():
        sys.exit(f"not found: {root.resolve()}  (run this from the repo root)")

    mpath = root / 'manifest.json'
    old = {}
    if mpath.exists():
        try:
            m = json.loads(mpath.read_text())
            for s in m.get('seasons', []):
                for w in s.get('weeks', []):
                    for r in w.get('reports', []):
                        old[(s['season'], w['week'], r['team'])] = r
        except Exception as e:
            print(f"warning: could not read the existing manifest ({e}); rebuilding from disk alone")

    found = scan(root)
    if a.list:
        weeks = sorted({(s, w) for s, w, _ in found}, reverse=True)
        print(f"{len(found)} report(s) published in {root}:")
        for s, w in weeks:
            teams = sorted(t for ss, ww, t in found if (ss, ww) == (s, w))
            print(f"   {s} week {w:<2}  {len(teams):2d} teams   {' '.join(teams)}")
        return 0

    # work out which weeks to remove
    doomed = set()
    if a.drop:
        doomed |= parse_spec(a.drop)
    if a.keep:
        keep = parse_spec(a.keep)
        doomed |= {(s, w) for s, w, _ in found if (s, w) not in keep}
    for s, w in sorted(doomed):
        d = root / str(s) / f'wk{w}'
        if not d.is_dir():
            print(f"   {s} week {w}: nothing published, skipping")
            continue
        n = len(list(d.glob('*.pdf')))
        if a.dry_run:
            print(f"   would delete {d}  ({n} report(s))")
        else:
            try:
                shutil.rmtree(d)
                print(f"   deleted {d}  ({n} report(s))")
            except OSError as e:
                print(f"   FAILED to delete {d}: {e.strerror} - close anything "
                      f"holding it open and run again")
    # drop now-empty season folders
    if not a.dry_run:
        for sd in root.glob('*'):
            if sd.is_dir() and not any(sd.glob('wk*')):
                try:
                    shutil.rmtree(sd); print(f"   removed empty {sd}")
                except OSError as e:
                    print(f"   note  could not remove empty {sd} ({e.strerror}); harmless")

    found = scan(root)
    if a.dry_run:
        # the folders are still there, so leave them out by hand or the summary
        # below would claim it is keeping the very weeks it just said it would delete
        found = {k: v for k, v in found.items() if (k[0], k[1]) not in doomed}
    entries = {}
    added = 0
    for key, pdf in found.items():
        season, week, team = key
        prev = old.get(key, {})
        if not prev:
            added += 1
        entries[key] = {
            'team': team,
            'name': prev.get('name') or TEAMS.get(team, team),
            'file': f'/reports/{season}/wk{week}/{team}.pdf',
            'bytes': pdf.stat().st_size,
            'pages': prev.get('pages') if prev.get('pages') else pages_of(pdf),
            'updated': prev.get('updated') or date.today().isoformat(),
            **({'source': prev['source']} if prev.get('source') else {}),
        }
    removed = [k for k in old if k not in entries]

    seasons = {}
    for (season, week, team), r in entries.items():
        seasons.setdefault(season, {}).setdefault(week, []).append(r)
    manifest = {
        'version': date.today().strftime('%Y%m%d'),
        'seasons': [
            {'season': s, 'weeks': [
                {'week': w, 'reports': sorted(rs, key=lambda r: r['team'])}
                for w, rs in sorted(seasons[s].items(), reverse=True)
            ]}
            for s in sorted(seasons, reverse=True)
        ],
    }

    print()
    for s in manifest['seasons']:
        for w in s['weeks']:
            print(f"   keeping {s['season']} week {w['week']:<2} - {len(w['reports'])} report(s)")
    if added:
        print(f"   picked up {added} PDF(s) that were on disk but not in the manifest")
    if removed:
        print(f"   dropped {len(removed)} manifest entry(ies) with no file on disk")
    if not entries:
        print("   nothing published - the page will show its empty state")

    if a.dry_run:
        print("\ndry run - manifest not written")
        return 0
    mpath.write_text(json.dumps(manifest, indent=2))
    total = sum(r['bytes'] for r in entries.values())
    print(f"\nwrote {mpath}  ({len(entries)} reports, {total/1048576:.0f} MB on disk)")
    print("commit and push to update the site:")
    print('   git add -A && git commit -m "reports: prune" && git pull --rebase && git push')
    return 0


if __name__ == '__main__':
    sys.exit(main())
