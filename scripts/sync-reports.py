#!/usr/bin/env python3
"""
sync-reports.py - make the published reports mirror ONE folder, exactly.

Point it at a folder of PDFs. Whatever is in that folder gets published.
Anything already published that is NOT in that folder gets deleted, and the
manifest is rebuilt to match. The folder is the source of truth, so curating
the site is just adding and removing files in it.

    python scripts/sync-reports.py "WeeklyReportQueryball/Published"

Unchanged files are skipped, so a weekly run only processes the new week
instead of re-compressing everything. Pass --force to redo them all.

    python scripts/sync-reports.py <folder> --dry-run    # say what would change
    python scripts/sync-reports.py <folder> --force      # reprocess everything

Filenames are read the same way publish-reports.py reads them, e.g.
"Arizona Cardinals - 2026 Wk9.pdf" or "2026_9_ARI.pdf".
"""
import argparse, importlib.util, json, shutil, sys, time
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent


def load_publisher():
    """borrow the naming, compression and page-count logic already in use"""
    p = HERE / 'publish-reports.py'
    if not p.exists():
        sys.exit(f"publish-reports.py must sit next to this script ({HERE})")
    spec = importlib.util.spec_from_file_location('qb_publish', p)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('source', help='the folder whose PDFs the site should mirror')
    ap.add_argument('--reports', default='public/reports')
    ap.add_argument('--dpi', type=int, default=1200,
                    help='image rewrite threshold; the default is high enough to skip '
                         'rewriting, which is what you want - lower it only to shrink files')
    ap.add_argument('--quality', type=int, default=75)
    ap.add_argument('--max-mb', type=float, default=24.0)
    ap.add_argument('--no-compress', action='store_true',
                    help='copy the PDFs through untouched, skipping PyMuPDF entirely')
    ap.add_argument('--force', action='store_true', help='reprocess every file, not just changed ones')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()

    pub = load_publisher()
    src_root = Path(a.source)
    out = Path(a.reports)
    if not src_root.is_dir():
        sys.exit(f"source folder not found: {src_root.resolve()}")
    out.mkdir(parents=True, exist_ok=True)

    # ---- what the folder says should be published -------------------------
    want = {}
    unreadable = []
    for f in sorted(src_root.rglob('*.pdf')):
        parsed = pub.parse_name(f.name)
        if not parsed or not parsed[2]:
            unreadable.append(f)
            continue
        season, week, team = parsed
        key = (season, week, team)
        if key not in want or f.stat().st_mtime > want[key].stat().st_mtime:
            want[key] = f
    print(f"source folder : {src_root}  ->  {len(want)} report(s)")
    for f in unreadable:
        print(f"   ignored (cannot read season/week/team from the name): {f.name}")
    if not want:
        print("nothing readable in that folder - stopping rather than wiping the site")
        return 3

    have = {}
    for pdf in out.glob('*/wk*/*.pdf'):
        try:
            have[(int(pdf.parent.parent.name), int(pdf.parent.name[2:]), pdf.stem.upper())] = pdf
        except ValueError:
            pass
    print(f"published now : {out}  ->  {len(have)} report(s)")

    add = [k for k in want if k not in have]
    gone = [k for k in have if k not in want]
    same = [k for k in want if k in have]
    changed = [] if a.force else [k for k in same
                                  if want[k].stat().st_mtime > have[k].stat().st_mtime + 1]
    todo = add + changed + (same if a.force else [])
    todo = sorted(set(todo))

    print(f"\n  to publish : {len(add)} new, {len(changed)} updated"
          f"{', ' + str(len(same)) + ' forced' if a.force else ''}")
    print(f"  to remove  : {len(gone)}")
    print(f"  unchanged  : {len(same) - len(changed) if not a.force else 0}")

    if a.dry_run:
        for k in sorted(gone):
            print(f"   would delete  {k[0]} wk{k[1]} {k[2]}")
        for k in todo:
            print(f"   would publish {k[0]} wk{k[1]} {k[2]}  <- {want[k].name}")
        print("\ndry run - nothing changed")
        return 0

    # ---- remove what the folder no longer holds ---------------------------
    stuck = []
    for k in sorted(gone):
        try:
            have[k].unlink()
            print(f"   removed  {k[0]} wk{k[1]} {k[2]}")
        except OSError as e:
            stuck.append((k, e.strerror))
            print(f"   FAILED to remove {k[0]} wk{k[1]} {k[2]}: {e.strerror} "
                  f"- close anything holding it open and run again")

    # ---- publish what is new or changed -----------------------------------
    skipped = []
    for k in todo:
        season, week, team = k
        f = want[k]
        d = out / str(season) / f'wk{week}'
        d.mkdir(parents=True, exist_ok=True)
        dst = d / f'{team}.pdf'
        tmp = dst.with_suffix('.tmp.pdf')
        t0 = time.time()
        ok = False
        if not a.no_compress:
            try:
                ok = pub.compress(f, tmp, a.dpi, a.quality)
            except Exception as e:                               # noqa: BLE001
                print(f"   warn  {f.name}: compression failed ({e}); copying as-is")
                ok = False
        if not ok:
            shutil.copyfile(f, tmp)
        # Compression on these decks often makes them BIGGER - PyMuPDF re-encodes
        # content Excel had already stored efficiently. Never ship the larger one.
        orig = f.stat().st_size
        if ok and tmp.stat().st_size >= orig:
            grew = tmp.stat().st_size
            tmp.unlink(); shutil.copyfile(f, tmp)
            print(f"   note  {f.name}: compression grew it to {grew/1e6:.1f} MB; "
                  f"keeping the {orig/1e6:.1f} MB original")
        size = tmp.stat().st_size
        if size > a.max_mb * 1e6:
            tmp.unlink()
            skipped.append((f, size))
            print(f"   SKIP  {f.name}: {size/1e6:.1f} MB exceeds --max-mb {a.max_mb}")
            continue
        tmp.replace(dst)
        print(f"   ok    {f.name} -> {dst}  "
              f"({f.stat().st_size/1e6:.1f} MB -> {size/1e6:.1f} MB, {time.time()-t0:.1f}s)")

    # ---- tidy empty folders ----------------------------------------------
    # Windows denies rmtree while anything holds a handle - Explorer, OneDrive,
    # antivirus. An empty folder left behind is cosmetic (git does not track
    # empty directories), so warn and carry on rather than abandoning the sync.
    def drop_dir(d):
        try:
            shutil.rmtree(d); print(f"   removed empty {d}")
        except OSError as e:
            print(f"   note  could not remove empty {d} ({e.strerror}); harmless, "
                  f"delete it by hand if you like")
    for wk in sorted(out.glob('*/wk*'), reverse=True):
        if wk.is_dir() and not any(wk.glob('*.pdf')):
            drop_dir(wk)
    for sd in sorted(out.glob('*')):
        if sd.is_dir() and not any(sd.glob('wk*')):
            drop_dir(sd)

    # ---- rebuild the manifest from what is actually on disk ---------------
    old = {}
    mpath = out / 'manifest.json'
    if mpath.exists():
        try:
            m = json.loads(mpath.read_text())
            for s in m.get('seasons', []):
                for w in s.get('weeks', []):
                    for r in w.get('reports', []):
                        old[(s['season'], w['week'], r['team'])] = r
        except Exception:
            pass

    entries = {}
    for pdf in out.glob('*/wk*/*.pdf'):
        try:
            season, week = int(pdf.parent.parent.name), int(pdf.parent.name[2:])
        except ValueError:
            continue
        team = pdf.stem.upper()
        prev = old.get((season, week, team), {})
        reused = prev.get('pages') if (season, week, team) not in todo else None
        entries[(season, week, team)] = {
            'team': team,
            'name': pub.TEAMS[team][0] if team in pub.TEAMS else team,
            'file': f'/reports/{season}/wk{week}/{team}.pdf',
            'bytes': pdf.stat().st_size,
            'pages': reused or pub.page_count(pdf),
            'updated': date.today().isoformat() if (season, week, team) in todo
                       else prev.get('updated', date.today().isoformat()),
        }

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
    mpath.write_text(json.dumps(manifest, indent=2))

    total = sum(r['bytes'] for r in entries.values())
    print()
    for s in manifest['seasons']:
        for w in s['weeks']:
            print(f"   live: {s['season']} week {w['week']:<2} - {len(w['reports'])} report(s)")
    print(f"\nwrote {mpath}  ({len(entries)} reports, {total/1048576:.0f} MB)")
    if skipped:
        print(f"{len(skipped)} file(s) were too large and are NOT published - lower --dpi for those")
    if stuck:
        print(f"{len(stuck)} file(s) could not be deleted and are STILL on the site - "
              f"close whatever has them open and run this again")
    print("commit and push to update the site:")
    print('   git add -A && git commit -m "reports: sync" && git pull --rebase && git push')
    return 0


if __name__ == '__main__':
    sys.exit(main())
