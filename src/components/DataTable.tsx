import { useState, useMemo, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'

export type Column<T> = {
  key: keyof T | string
  label: string
  align?: 'left' | 'right' | 'center'
  numeric?: boolean
  format?: (v: any, row: T) => ReactNode
  width?: string
}

export default function DataTable<T extends Record<string, any>>({
  rows, columns, defaultSort, dense = false,
}: {
  rows: T[]
  columns: Column<T>[]
  defaultSort?: { key: string; dir: 'asc' | 'desc' }
  dense?: boolean
}) {
  const [sort, setSort] = useState(defaultSort)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const k = sort.key as keyof T
    const arr = [...rows].sort((a, b) => {
      const av = a[k], bv = b[k]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.dir === 'asc' ? av - bv : bv - av
      }
      const cmp = String(av).localeCompare(String(bv))
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [rows, sort])

  const toggleSort = (key: string) => {
    setSort(s => {
      if (s?.key !== key) return { key, dir: 'desc' }
      return { key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="qb-table">
        <thead>
          <tr>
            {columns.map(c => (
              <th key={String(c.key)}
                style={{ width: c.width, textAlign: c.align ?? (c.numeric ? 'right' : 'left') }}>
                <button
                  type="button"
                  onClick={() => toggleSort(String(c.key))}
                  className="inline-flex items-center gap-1 hover:text-ink"
                >
                  {c.label}
                  {sort?.key === c.key && (sort.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={i}>
              {columns.map(c => (
                <td key={String(c.key)}
                  className={clsx(c.numeric && 'num', dense && 'py-1.5')}
                  style={{ textAlign: c.align ?? (c.numeric ? 'right' : 'left') }}>
                  {c.format ? c.format(r[c.key as keyof T], r) : String(r[c.key as keyof T] ?? '–')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
