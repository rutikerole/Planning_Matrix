// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #71 — Generic Linear-style data table
//
// One component, six tabs. Each tab supplies a column config + row
// data; this component renders the header, sortable column clicks,
// row hover, and the empty state. Density-honest: 32px row height,
// no excess padding.
// ───────────────────────────────────────────────────────────────────────

import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CockpitColumn<TRow> {
  id: string
  header: string
  /** When provided, the column is sortable; the function returns the
   * value to compare. */
  sortValue?: (row: TRow) => string | number
  render: (row: TRow) => ReactNode
  /** Tailwind width class — defaults to flex. */
  className?: string
  align?: 'left' | 'right'
}

interface Props<TRow> {
  rows: TRow[]
  columns: CockpitColumn<TRow>[]
  rowKey: (row: TRow) => string
  /** Optional filter input (live search). */
  searchable?: (row: TRow) => string
  searchPlaceholder?: string
  /** Empty-state message. */
  emptyMessage: string
}

export function CockpitTable<TRow>({
  rows,
  columns,
  rowKey,
  searchable,
  searchPlaceholder,
  emptyMessage,
}: Props<TRow>) {
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim() || !searchable) return rows
    const needle = search.trim().toLowerCase()
    return rows.filter((r) => searchable(r).toLowerCase().includes(needle))
  }, [rows, search, searchable])

  const sorted = useMemo(() => {
    if (!sortBy) return filtered
    const col = columns.find((c) => c.id === sortBy)
    if (!col?.sortValue) return filtered
    const arr = [...filtered]
    arr.sort((a, b) => {
      const av = col.sortValue!(a)
      const bv = col.sortValue!(b)
      if (av === bv) return 0
      const cmp = av < bv ? -1 : 1
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filtered, columns, sortBy, sortDir])

  const toggleSort = (id: string) => {
    if (sortBy === id) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(id)
      setSortDir('asc')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {searchable && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder ?? 'Suche…'}
          className="self-start w-full max-w-xs h-9 px-3 bg-paper border border-ink/15 text-[13px] text-ink placeholder:text-ink/40 rounded-[var(--pm-radius-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
      )}

      {sorted.length === 0 ? (
        <p className="text-[13px] italic text-clay/72 py-6">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <table className="w-full min-w-[640px] sm:min-w-0">
            <thead>
              <tr className="border-b border-ink/12">
                {columns.map((col) => {
                  const isActive = sortBy === col.id
                  const isSortable = !!col.sortValue
                  return (
                    <th
                      key={col.id}
                      className={cn(
                        'text-left px-2 py-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-clay/85',
                        col.align === 'right' && 'text-right',
                        col.className,
                      )}
                      scope="col"
                    >
                      {isSortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col.id)}
                          className="inline-flex items-center gap-1 hover:text-ink transition-colors duration-soft"
                        >
                          {col.header}
                          {isActive && (
                            sortDir === 'asc' ? (
                              <ChevronUp aria-hidden="true" className="size-3" />
                            ) : (
                              <ChevronDown aria-hidden="true" className="size-3" />
                            )
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b border-ink/[0.06] hover:bg-ink/[0.02] transition-colors duration-soft"
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        'px-2 py-2.5 text-[13px] text-ink align-top',
                        col.align === 'right' && 'text-right',
                        col.className,
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
