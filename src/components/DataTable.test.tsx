import { act, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DataTable, { type DataTableColumn } from './DataTable'
import { desktopWidth, mobileWidth, setViewportWidth } from '@/test/viewport'

interface Row {
  id: number
  type: string
  dates: string
}

const rows: Row[] = [
  { id: 1, type: 'Vacation', dates: '2026-09-01 – 2026-09-04' },
  { id: 2, type: 'Sick', dates: '2026-10-02 – 2026-10-02' },
]

const columns: DataTableColumn<Row>[] = [
  { key: 'type', header: 'Type', cell: (r) => r.type },
  { key: 'dates', header: 'Dates', cell: (r) => r.dates },
]

function renderTable(overrides: Partial<Parameters<typeof DataTable<Row>>[0]>) {
  return render(
    <DataTable
      caption="Time-off requests"
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      emptyMessage="Nothing here yet."
      {...overrides}
    />
  )
}

describe('DataTable at and above the table breakpoint', () => {
  it('renders a table with a header row per column', () => {
    setViewportWidth(desktopWidth())
    renderTable({})

    const table = screen.getByTestId('data-table')
    expect(table.tagName).toBe('TABLE')
    expect(screen.queryByTestId('data-cards')).not.toBeInTheDocument()

    const headers = within(table).getAllByRole('columnheader')
    expect(headers.map((h) => h.textContent)).toEqual(['Type', 'Dates'])
  })

  it('renders one row per record with one cell per column', () => {
    setViewportWidth(desktopWidth())
    const { container } = renderTable({})

    const bodyRows = Array.from(container.querySelectorAll('tbody tr'))
    expect(bodyRows).toHaveLength(rows.length)
    for (const row of bodyRows) {
      expect(row.querySelectorAll('td')).toHaveLength(columns.length)
    }
  })

  it('keeps loading, empty and error states inside the table', () => {
    setViewportWidth(desktopWidth())
    const { rerender } = renderTable({ rows: null })
    expect(screen.getByTestId('table-loading-state')).toBeInTheDocument()

    rerender(
      <DataTable
        caption="Time-off requests"
        columns={columns}
        rows={[]}
        rowKey={(r: Row) => r.id}
        emptyMessage="Nothing here yet."
      />
    )
    expect(screen.getByTestId('table-empty-state')).toBeInTheDocument()

    rerender(
      <DataTable
        caption="Time-off requests"
        columns={columns}
        rows={null}
        rowKey={(r: Row) => r.id}
        emptyMessage="Nothing here yet."
        error={new Error('Boom')}
      />
    )
    expect(screen.getByTestId('table-error-state')).toBeInTheDocument()
  })
})

describe('DataTable below the table breakpoint', () => {
  it('renders one card per record instead of a table', () => {
    setViewportWidth(mobileWidth())
    renderTable({})

    expect(screen.queryByTestId('data-table')).not.toBeInTheDocument()
    expect(screen.getByTestId('data-cards')).toBeInTheDocument()
    expect(screen.getAllByTestId('data-card')).toHaveLength(rows.length)
  })

  it('labels every value in a card with its column header', () => {
    setViewportWidth(mobileWidth())
    renderTable({})

    const [first] = screen.getAllByTestId('data-card')
    const terms = first!.querySelectorAll('dt')
    const values = first!.querySelectorAll('dd')
    expect(Array.from(terms).map((t) => t.textContent)).toEqual([
      'Type',
      'Dates',
    ])
    expect(Array.from(values).map((v) => v.textContent)).toEqual([
      rows[0]!.type,
      rows[0]!.dates,
    ])
  })

  it('uses the non-table loading, empty and error states', () => {
    setViewportWidth(mobileWidth())
    const { rerender } = renderTable({ rows: null })
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()

    rerender(
      <DataTable
        caption="Time-off requests"
        columns={columns}
        rows={[]}
        rowKey={(r: Row) => r.id}
        emptyMessage="Nothing here yet."
      />
    )
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()

    rerender(
      <DataTable
        caption="Time-off requests"
        columns={columns}
        rows={null}
        rowKey={(r: Row) => r.id}
        emptyMessage="Nothing here yet."
        error={new Error('Boom')}
      />
    )
    expect(screen.getByTestId('error-state')).toBeInTheDocument()
  })
})

describe('DataTable when the viewport crosses the breakpoint', () => {
  it('swaps between the two forms without losing a record', () => {
    setViewportWidth(desktopWidth())
    renderTable({})
    expect(screen.getByTestId('data-table')).toBeInTheDocument()

    act(() => setViewportWidth(mobileWidth()))
    expect(screen.queryByTestId('data-table')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('data-card')).toHaveLength(rows.length)

    act(() => setViewportWidth(desktopWidth()))
    expect(screen.getByTestId('data-table')).toBeInTheDocument()
    expect(screen.queryAllByTestId('data-card')).toHaveLength(0)
  })
})
