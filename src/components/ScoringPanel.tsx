/**
 * ScoringPanel — the league-scoring controls.
 *
 * Rendered inside the mobile filter sheet (its own "Scoring" group) and the
 * desktop slicer rail. Presets up top; the rows beneath edit the individual
 * values and flip the preset to "Custom". Everything on the site that shows
 * fantasy points re-computes when this changes (see lib/scoring.ts).
 */
import clsx from 'clsx'
import { useScoring, PRESETS, presetName, type Scoring } from '@/lib/scoring'

function Seg<T extends string | number | boolean>({ value, options, onChange, fmt }: {
  value: T; options: T[]; onChange: (v: T) => void; fmt?: (v: T) => string
}) {
  return (
    <div className="qb-seg">
      {options.map(o => (
        <button key={String(o)} type="button" className={clsx(o === value && 'on')} onClick={() => onChange(o)}>{fmt ? fmt(o) : String(o)}</button>
      ))}
    </div>
  )
}

export default function ScoringPanel({ compact = false }: { compact?: boolean }) {
  const [s, set] = useScoring()
  const preset = presetName(s)
  const patch = (p: Partial<Scoring>) => set({ ...s, ...p })
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className={clsx('flex items-center justify-between gap-2 border-b border-line', compact ? 'py-1.5' : 'py-2')}>
      <span className={clsx('text-ink', compact ? 'text-[11px]' : 'text-[12px]')}>{label}</span>
      {children}
    </div>
  )
  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-2">
        {(['ppr', 'half', 'std'] as const).map(k => (
          <button key={k} type="button" onClick={() => set(PRESETS[k])}
            className={clsx('chip', compact ? 'text-[10.5px]' : 'text-[11.5px]', preset === k && 'applied')}>
            {k === 'ppr' ? 'PPR' : k === 'half' ? 'Half PPR' : 'Standard'}
          </button>
        ))}
        <span className={clsx('chip border-dashed', compact ? 'text-[10.5px]' : 'text-[11.5px]', preset === 'custom' && 'applied')}>Custom</span>
      </div>
      <Row label="Reception"><Seg value={s.rec} options={[0, 0.5, 1]} onChange={v => patch({ rec: v })} /></Row>
      <Row label="Passing TD"><Seg value={s.passTd} options={[4, 6]} onChange={v => patch({ passTd: v })} /></Row>
      <Row label="Passing yards"><Seg value={s.passYdPt} options={[25, 20]} onChange={v => patch({ passYdPt: v })} fmt={v => `1 / ${v}`} /></Row>
      <Row label="Rush / rec yards"><Seg value={s.rushRecYdPt} options={[10, 5]} onChange={v => patch({ rushRecYdPt: v })} fmt={v => `1 / ${v}`} /></Row>
      <Row label="TE premium"><Seg value={s.tePrem} options={[0, 0.5, 1]} onChange={v => patch({ tePrem: v })} fmt={v => v ? `+${v}` : '0'} /></Row>
      <Row label="INT / fumble lost"><Seg value={s.int} options={[-2, -1]} onChange={v => patch({ int: v, fum: v })} /></Row>
      <div className={clsx('flex items-center justify-between gap-2', compact ? 'py-1.5' : 'py-2')}>
        <span className={clsx('text-ink', compact ? 'text-[11px]' : 'text-[12px]')}>Bonuses (100 rush/rec, 300 pass)</span>
        <Seg value={s.bonus} options={[false, true]} onChange={v => patch({ bonus: v })} fmt={v => v ? '+3' : 'off'} />
      </div>
      <p className={clsx('text-muted leading-snug mt-1', compact ? 'text-[10px]' : 'text-[11px]')}>
        Applies to every fantasy number on the site — Fantasy tabs, Studio, Matchup. Saved in this browser and carried in shared links.
      </p>
    </div>
  )
}
