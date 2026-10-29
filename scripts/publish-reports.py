#!/usr/bin/env python3
"""
publish-reports.py — put the weekly team report PDFs on the site.

Scans one or more folders of PDFs exported from the Report Base File (the
PrintAllTeams macro), works out season / week / team from each filename,
shrinks the embedded images so the files are web-sized, copies them into
public/reports/<season>/wk<week>/<TEAM>.pdf and writes public/reports/manifest.json,
which the Weekly Reports page reads.

Usage (from the repo root):
    python scripts/publish-reports.py WeeklyReportQueryball/Outputs
    python scripts/publish-reports.py "C:/Users/ajhay/.../Outputs" --dpi 150 --quality 75
    python scripts/publish-reports.py Outputs --no-compress        # copy as-is
    python scripts/publish-reports.py Outputs --rebuild            # ignore the existing manifest

Filename patterns understood (case-insensitive):
    2026_3_CarolinaPanthers.pdf          season_week_TeamName
    2026_3_ChiBears.pdf                  any string containing a nickname (bears)
    Carolina Panthers - 2026 Wk3.pdf     "Team - season WkN"
    CAR_2026_3.pdf                       ABBR_season_week
If the same (season, week, team) appears more than once, the most recently
modified file wins.

Image compression needs PyMuPDF:   pip install pymupdf
Without it the PDFs are copied unchanged (and anything over --max-mb is
skipped with a warning, because Cloudflare serves files up to 25 MiB).
"""
import argparse, json, os, re, shutil, sys, time
from datetime import date
from pathlib import Path

TEAMS = {
    'ARI': ('Arizona Cardinals', ['cardinals', 'arizona']), 'ATL': ('Atlanta Falcons', ['falcons', 'atlanta']),
    'BAL': ('Baltimore Ravens', ['ravens', 'baltimore']), 'BUF': ('Buffalo Bills', ['bills', 'buffalo']),
    'CAR': ('Carolina Panthers', ['panthers', 'carolina']), 'CHI': ('Chicago Bears', ['bears', 'chicago']),
    'CIN': ('Cincinnati Bengals', ['bengals', 'cincinnati']), 'CLE': ('Cleveland Browns', ['browns', 'cleveland']),
    'DAL': ('Dallas Cowboys', ['cowboys', 'dallas']), 'DEN': ('Denver Broncos', ['broncos', 'denver']),
    'DET': ('Detroit Lions', ['lions', 'detroit']), 'GB': ('Green Bay Packers', ['packers', 'greenbay', 'green bay']),
    'HOU': ('Houston Texans', ['texans', 'houston']), 'IND': ('Indianapolis Colts', ['colts', 'indianapolis']),
    'JAX': ('Jacksonville Jaguars', ['jaguars', 'jacksonville']), 'KC': ('Kansas City Chiefs', ['chiefs', 'kansascity', 'kansas city']),
    'LAC': ('Los Angeles Chargers', ['chargers']), 'LAR': ('Los Angeles Rams', ['rams']),
    'LV': ('Las Vegas Raiders', ['raiders', 'lasvegas', 'las vegas']), 'MIA': ('Miami Dolphins', ['dolphins', 'miami']),
    'MIN': ('Minnesota Vikings', ['vikings', 'minnesota']), 'NE': ('New England Patriots', ['patriots', 'newengland', 'new england']),
    'NO': ('New Orleans Saints', ['saints', 'neworleans', 'new orleans']), 'NYG': ('New York Giants', ['giants']),
    'NYJ': ('New York Jets', ['jets']), 'PHI': ('Philadelphia Eagles', ['eagles', 'philadelphia']),
    'PIT': ('Pittsburgh Steelers', ['steelers', 'pittsburgh']), 'SEA': ('Seattle Seahawks', ['seahawks', 'seattle']),
    'SF': ('San Francisco 49ers', ['49ers', 'niners', 'sanfrancisco', 'san francisco']), 'TB': ('Tampa Bay Buccaneers', ['buccaneers', 'bucs', 'tampa']),
    'TEN': ('Tennessee Titans', ['titans', 'tennessee']), 'WAS': ('Washington Commanders', ['commanders', 'washington']),
}

def team_from(text: str):
    t = text.lower()
    for abbr, (_, words) in TEAMS.items():
        if any(w in t for w in words):
            return abbr
    up = re.sub(r'[^A-Za-z]', '', text).upper()
    if up in TEAMS:
        return up
    return None

def parse_name(name: str):
    stem = Path(name).stem
    m = re.match(r'^(\d{4})[_ -](\d{1,2})[_ -](.+)$', stem)              # 2026_3_CarolinaPanthers
    if m:
        return int(m.group(1)), int(m.group(2)), team_from(m.group(3))
    m = re.match(r'^(.+?)\s*-\s*(\d{4})\s*wk\s*(\d{1,2})', stem, re.I)       # Carolina Panthers - 2026 Wk3
    if m:
        return int(m.group(2)), int(m.group(3)), team_from(m.group(1))
    m = re.match(r'^([A-Za-z]{2,3})[_ -](\d{4})[_ -](\d{1,2})$', stem)      # CAR_2026_3
    if m:
        return int(m.group(2)), int(m.group(3)), team_from(m.group(1))
    m = re.match(r'^(.+?)(\d{4})[._ -](\d{1,2})$', stem)                    # Washington2025.17
    if m:
        return int(m.group(2)), int(m.group(3)), team_from(m.group(1))
    return None

def compress(src: Path, dst: Path, dpi: int, quality: int) -> bool:
    try:
        import pymupdf  # type: ignore
    except ImportError:
        try:
            import fitz as pymupdf  # type: ignore
        except ImportError:
            return False
    doc = pymupdf.open(str(src))
    if hasattr(doc, 'rewrite_images'):
        doc.rewrite_images(dpi_threshold=dpi + 30, dpi_target=dpi, quality=quality, lossy=True, lossless=True)
    doc.save(str(dst), garbage=4, deflate=True)
    doc.close()
    return True

def page_count(p: Path):
    try:
        from pypdf import PdfReader
        return len(PdfReader(str(p)).pages)
    except Exception:
        return None

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('sources', nargs='+', help='folders (or single PDFs) to publish')
    ap.add_argument('--out', default='public/reports', help='destination inside the site (default public/reports)')
    ap.add_argument('--no-compress', action='store_true', help='copy PDFs as-is')
    ap.add_argument('--dpi', type=int, default=150, help='image DPI after compression (default 150)')
    ap.add_argument('--quality', type=int, default=75, help='JPEG quality after compression (default 75)')
    ap.add_argument('--max-mb', type=float, default=24.0, help='skip files larger than this after compression (Cloudflare limit is 25 MiB)')
    ap.add_argument('--rebuild', action='store_true', help='ignore the existing manifest instead of merging into it')
    ap.add_argument('--no-recurse', action='store_true', help='only look at the top level of each source folder')
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    manifest_path = out / 'manifest.json'
    manifest = {'version': '', 'seasons': []}
    if manifest_path.exists() and not args.rebuild:
        try:
            manifest = json.loads(manifest_path.read_text())
        except Exception:
            pass
    # index existing entries
    entries = {}
    for s in manifest.get('seasons', []):
        for w in s.get('weeks', []):
            for r in w.get('reports', []):
                entries[(s['season'], w['week'], r['team'])] = r

    # collect candidates, newest-modified wins per (season, week, team)
    found = {}
    skipped = []
    for src in args.sources:
        p = Path(src)
        files = [p] if p.is_file() else (list(p.glob('*.pdf')) if args.no_recurse else list(p.rglob('*.pdf')))
        for f in files:
            if 'outdated' in str(f).lower() or 'older' in f.name.lower():
                skipped.append((f, 'looks outdated')); continue
            parsed = parse_name(f.name)
            if not parsed or not parsed[2]:
                skipped.append((f, 'could not read season/week/team from the name')); continue
            key = parsed
            if key not in found or f.stat().st_mtime > found[key].stat().st_mtime:
                found[key] = f

    print(f'{len(found)} report(s) to publish, {len(skipped)} skipped')
    for f, why in skipped:
        print(f'  skip  {f.name}: {why}')

    for (season, week, team), f in sorted(found.items()):
        dst_dir = out / str(season) / f'wk{week}'
        dst_dir.mkdir(parents=True, exist_ok=True)
        dst = dst_dir / f'{team}.pdf'
        tmp = dst.with_suffix('.tmp.pdf')
        t0 = time.time()
        done = False
        if not args.no_compress:
            try:
                done = compress(f, tmp, args.dpi, args.quality)
            except Exception as e:
                print(f'  warn  {f.name}: compression failed ({e}); copying as-is')
                done = False
        if not done:
            shutil.copyfile(f, tmp)
        size = tmp.stat().st_size
        if size > args.max_mb * 1024 * 1024:
            tmp.unlink(missing_ok=True)
            print(f'  SKIP  {f.name}: {size/1e6:.1f} MB after processing exceeds --max-mb {args.max_mb}. '
                  f'Host it on R2 and add the URL to manifest.json by hand, or lower --dpi.')
            continue
        tmp.replace(dst)
        entries[(season, week, team)] = {
            'team': team, 'name': TEAMS[team][0],
            'file': f'/reports/{season}/wk{week}/{team}.pdf',
            'bytes': size, 'pages': page_count(dst), 'updated': date.today().isoformat(),
            'source': f.name,
        }
        print(f'  ok    {f.name} -> {dst}  ({f.stat().st_size/1e6:.1f} MB -> {size/1e6:.1f} MB, {time.time()-t0:.1f}s)')

    # rebuild nested manifest
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
    manifest_path.write_text(json.dumps(manifest, indent=2))
    print(f'wrote {manifest_path} ({sum(len(w["reports"]) for s in manifest["seasons"] for w in s["weeks"])} reports)')

if __name__ == '__main__':
    main()
