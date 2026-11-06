/**
 * Studio — pick rows and metrics, get a table.
 *
 * Rows are dimensions (player, team, week, down, score state, …), metrics
 * come from the curated library in lib/studio.ts, and the slicers are the
 * same ones every deck uses (opened through the filter sheet). The whole
 * query is encoded in the URL, so a share link reproduces it exactly.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Plus, X, Link2, Download, Star, BarChart3, SlidersHorizontal, ChevronDown, ChevronUp, Loader2, Check } from 'lucide-react'
import clsx from 'clsx'
import { useSlicers } from '@/lib/slicers'
import { useQuery } from '@/lib/useQuery'
import { sliceLabel } from '@/lib/slicerSql'
import {
  DIMS, METRICS, DIM_BY_KEY, METRIC_BY_KEY, buildStudioSql, studioFromParams, studioToParams, formatMetric, saveQuery,
  type StudioState, type DimKey,
} from '@/lib/studio'
import FilterSheet from '@/components/mobile/FilterSheet'
import { useActiveBadges } from '@/components/mobile/useActiveBadges'
import { BarTile, PALETTE } from '@/components/charts/Charts'
import { ContextStamp, ShareButton } from '@/components/mobile/Share'
import { useScoring } from '@/lib/scoring'

const STUDIO_GROUPS = ['season', 'week', 'position', 'team', 'opponent', 'homeAway', 'down', 'distance', 'score', 'zone', 'qtr', 'passDepth', 'runDir', 'pressure', 'shotgun', 'playType'] as const

export default function Studio() {
  const [search, setSearch] = useSearchParams()
  const st = useMemo(() => studioFromParams(search), [search])
  const { slicers } = useSlicers()
  const [scoring] = useScoring()
  const setSt = (patch: Partial<StudioState>) => setSearch(studioToParams({ ...st, ...patch }, new URLSearchParams(search)), { replace: true })

  const [sheet, setSheet] = useState(false)
  const [chooser, setChooser] = useState<null | 'rows' | 'metrics'>(null)
  const [chart, setChart] = useState(false)
  const [copied, setCopied] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const sql = useMemo(() => buildStudioSql(st, slicers), [st, slicers, scoring])
  const q = useQuery<any>(sql, [sql])
  const rows = q.data ?? []
  const { badges } = useActiveBadges()

  const dims = st.rows.map(k => DIM_BY_KEY[k]).filter(Boolean)
  const mets = st.metrics.map(k => METRIC_BY_KEY[k]).filter(Boolean)

  const toggleSort = (key: string) => {
    const dir = st.sort?.key === key ? (st.sort.dir === 'desc' ? 'asc' : 'desc') : 'desc'
    setSt({ sort: { key, dir } })
  }
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ }
  }
  const downloadCsv = () => {
    const head = [...dims.map(d => d.label), ...mets.map(m => m.label)]
    const lines = rows.map(r => [...dims.map(d => r[d.key]), ...mets.map(m => r[m.key])].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    const csv = [head.join(','), ...lines].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = 'queryball-studio.csv'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  const save = () => {
    const title = window.prompt('Name this query', `${mets[0]?.label ?? 'Query'} by ${dims.map(d => d.label).join(', ') || 'total'} · ${sliceLabel(slicers)}`)
    if (!title) return
    saveQuery({ title, params: search.toString() })
    setSavedMsg('Saved to your gallery'); setTimeout(() => setSavedMsg(null), 2000)
  }
  useEffect(() => { document.title = 'Studio — QueryBall' }, [])

  const chartData = useMemo(() => {
    if (!mets.length) return []
    return rows.slice(0, 15).map(r => ({ name: dims.length ? dims.map(d => String(r[d.key] ?? '')).join(' · ') : 'All', value: Number(r[mets[0].key]) || 0 }))
  }, [rows, dims, mets])

  return (
    <div className="bg-paper qb-mobile-deck">
      <div className="max-w-[1100px] mx-auto px-4 lg:px-6 py-6 lg:py-10">
        <div className="mb-5">
          <p className="eyebrow">Studio</p>
          <h1 className="font-display text-3xl lg:text-5xl mt-1 tracking-tight">Pick rows and metrics. Get a table.</h1>
          <p className="mt-2 text-[13px] lg:text-sm text-muted max-w-2xl leading-relaxed">
            Same play-by-play, same filters as the decks — arranged however you want. Every query lives in the URL, so copy the link to share it,
            or save it to <Link to="/gallery" className="text-accent underline underline-offset-2">the gallery</Link>.
          </p>
        </div>

        {/* Builder */}
        <div className="qcard p-4 space-y-4">
          <Section label="Rows" hint="group by" onAdd={() => setChooser(c => c === 'rows' ? null : 'rows')} open={chooser === 'rows'}>
            {dims.map(d => <Pill key={d.key} onRemove={() => setSt({ rows: st.rows.filter(k => k !== d.key) })}>{d.label}</Pill>)}
            {!dims.length && <span className="text-[12px] text-muted">No rows — one total line</span>}
          </Section>
          {chooser === 'rows' && (
            <Chooser>
              {(['who', 'when', 'situation'] as const).map(g => (
                <div key={g}>
                  <p className="eyebrow mb-1.5">{g === 'who' ? 'Who' : g === 'when' ? 'When' : 'Situation'}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {DIMS.filter(d => d.group === g).map(d => (
                      <button key={d.key} type="button" title={d.blurb}
                        onClick={() => setSt({ rows: st.rows.includes(d.key) ? st.rows.filter(k => k !== d.key) : [...st.rows, d.key as DimKey] })}
                        className={clsx('chip', st.rows.includes(d.key) && 'applied')}>{d.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </Chooser>
          )}

          <Section label="Metrics" hint={`library · ${METRICS.length}`} onAdd={() => setChooser(c => c === 'metrics' ? null : 'metrics')} open={chooser === 'metrics'}>
            {mets.map(m => <Pill key={m.key} onRemove={() => setSt({ metrics: st.metrics.filter(k => k !== m.key) })}>{m.label}</Pill>)}
            {!mets.length && <span className="text-[12px] text-bad">Pick at least one metric</span>}
          </Section>
          {chooser === 'metrics' && (
            <Chooser>
              {(['passing', 'rushing', 'receiving', 'combined'] as const).map(g => (
                <div key={g}>
                  <p className="eyebrow mb-1.5 capitalize">{g}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {METRICS.filter(m => m.group === g).map(m => (
                      <button key={m.key} type="button" title={m.blurb}
                        onClick={() => setSt({ metrics: st.metrics.includes(m.key) ? st.metrics.filter(k => k !== m.key) : [...st.metrics, m.key] })}
                        className={clsx('chip', st.metrics.includes(m.key) && 'applied')}>{m.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </Chooser>
          )}

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="group-label">Filters</span>
              <span className="text-[11px] text-muted">{sliceLabel(slicers)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => setSheet(true)} className="qb-filterbtn"><SlidersHorizontal className="h-3.5 w-3.5" /> Filters &amp; situations</button>
              {badges.map(b => <button key={b.key} type="button" onClick={b.clear} className={clsx('qb-ctxchip', b.kind === 'situation' && 'sit', b.kind === 'identity' && 'id')}>{b.label}{b.key !== 'seasons' && <X className="h-3 w-3 opacity-60" />}</button>)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-line">
            <label className="inline-flex items-center gap-2 text-[12px] text-ink">
              <input type="checkbox" checked={st.perGame} onChange={e => setSt({ perGame: e.target.checked })} className="accent-[#2A3B47]" /> Per game
            </label>
            <label className="inline-flex items-center gap-2 text-[12px] text-ink">
              Rows
              <select value={st.limit} onChange={e => setSt({ limit: Number(e.target.value) })} className="rounded border border-line bg-paper px-2 py-1 text-[12px]">
                {[25, 50, 100, 250, 500, 1000].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <span className="ml-auto text-[11.5px] text-muted num">
              {q.loading ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> running…</span> : q.error ? <span className="text-bad">query error</span> : `${rows.length.toLocaleString()} rows`}
            </span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <Tool onClick={copyLink} icon={copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}>{copied ? 'Copied' : 'Copy link'}</Tool>
          <Tool onClick={downloadCsv} icon={<Download className="h-3.5 w-3.5" />}>CSV</Tool>
          <Tool onClick={save} icon={<Star className="h-3.5 w-3.5" />}>{savedMsg ?? 'Save'}</Tool>
          <Tool onClick={() => setChart(c => !c)} icon={<BarChart3 className="h-3.5 w-3.5" />} active={chart}>Chart it</Tool>
          <ShareButton target={canvasRef} title="Studio" className="ml-auto" />
        </div>

        {/* Results */}
        <div ref={canvasRef} className="mt-3 bg-paper">
          {chart && mets.length > 0 && (
            <div className="qcard p-3 mb-3">
              <p className="eyebrow mb-2">{mets[0].label}{st.perGame && mets[0].count ? ' per game' : ''} · top {chartData.length}</p>
              <BarTile data={chartData} height={Math.max(220, chartData.length * 18)} color={PALETTE.accent} formatY={(v: number) => formatMetric(v, mets[0].fmt)} />
            </div>
          )}
          <div className="qcard overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="qb-table qb-studio-table w-full">
                <thead>
                  <tr>
                    {dims.map(d => <th key={d.key} onClick={() => toggleSort(d.key)} className="cursor-pointer whitespace-nowrap">{d.label}<SortMark st={st} k={d.key} /></th>)}
                    {!dims.length && <th>Total</th>}
                    {mets.map(m => <th key={m.key} onClick={() => toggleSort(m.key)} className="cursor-pointer whitespace-nowrap text-right">{m.label}{st.perGame && m.count ? '/g' : ''}<SortMark st={st} k={m.key} /></th>)}
                  </tr>
                </thead>
                <tbody>
                  {q.loading && !rows.length && (
                    <tr><td colSpan={dims.length + mets.length + 1} className="text-center text-muted py-8">Running…</td></tr>
                  )}
                  {!q.loading && !rows.length && (
                    <tr><td colSpan={dims.length + mets.length + 1} className="text-center text-muted py-8">Nothing matches this slice. Loosen a filter.</td></tr>
                  )}
                  {rows.map((r, i) => (
                    <tr key={i}>
                      {dims.map(d => <td key={d.key} className="whitespace-nowrap font-medium text-accent2 text-[12px]">{String(r[d.key] ?? '–')}</td>)}
                      {!dims.length && <td className="font-medium text-accent2 text-[12px]">All</td>}
                      {mets.map(m => <td key={m.key} className="text-right num text-[12px]">{formatMetric(r[m.key], m.fmt)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 pb-2"><ContextStamp title="Studio" /></div>
          </div>
        </div>
      </div>

      <FilterSheet open={sheet} onClose={() => setSheet(false)} groups={STUDIO_GROUPS} showPlayerPicker={false} />
    </div>
  )
}

function Section({ label, hint, onAdd, open, children }: { label: string; hint: string; onAdd: () => void; open: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="group-label">{label}</span>
        <span className="text-[11px] text-muted">{hint}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {children}
        <button type="button" onClick={onAdd} className={clsx('chip border-dashed', open && 'applied')}>
          {open ? <ChevronUp className="h-3 w-3" /> : <Plus className="h-3 w-3" />} {open ? 'done' : 'add'}
        </button>
      </div>
    </div>
  )
}
function Pill({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return <span className="qb-ctxchip id">{children}<button type="button" onClick={onRemove} aria-label="Remove"><X className="h-3 w-3 opacity-60" /></button></span>
}
function Chooser({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-line bg-cream p-3 space-y-3">{children}</div>
}
function Tool({ onClick, icon, children, active = false }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode; active?: boolean }) {
  return <button type="button" onClick={onClick} className={clsx('qb-sharebtn', active && 'bg-accent2 text-paper border-accent2')}>{icon}<span>{children}</span></button>
}
function SortMark({ st, k }: { st: StudioState; k: string }) {
  if (st.sort?.key !== k) return null
  return st.sort.dir === 'desc' ? <ChevronDown className="inline h-3 w-3 ml-0.5" /> : <ChevronUp className="inline h-3 w-3 ml-0.5" />
}
