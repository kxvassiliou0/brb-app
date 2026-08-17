import { getLeaveYear, isWithinLeaveYear } from '../../src/lib/leaveYear'
import { login, USERS } from '../support/e2e'

const TYPE_CELL = 0
const DATES_CELL = 1
const DAYS_CELL = 2
const STATUS_CELL = 3

interface RequestRow {
  type: string
  startDate: string
  days: number
  status: string
}

function toDateKey(displayed: string): string {
  const parsed = new Date(displayed.split('–')[0]!.trim())
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${parsed.getFullYear()}-${month}-${day}`
}

function statNumber(label: string): Cypress.Chainable<number> {
  return cy
    .contains('[data-testid="stat-card"]', label)
    .find('[data-testid="stat-value"]')
    .invoke('text')
    .then((text) => Number.parseInt(text, 10))
}

function requestRows(): Cypress.Chainable<RequestRow[]> {
  return cy.get('[data-testid="data-table"] tbody tr').then(($rows) =>
    Cypress._.map($rows, (row) => {
      const cells = Cypress.$(row)
        .find('td')
        .toArray()
        .map((cell) => cell.innerText.trim())
      return {
        type: cells[TYPE_CELL]!,
        startDate: toDateKey(cells[DATES_CELL]!),
        days: Number(cells[DAYS_CELL]),
        status: cells[STATUS_CELL]!,
      }
    })
  )
}

function sumDays(rows: RequestRow[]): number {
  return rows.reduce((total, row) => total + row.days, 0)
}

describe('employee dashboard', () => {
  beforeEach(() => {
    login(USERS.employee, '/')
    cy.get('[data-testid="screen-employee-dashboard"]').should('be.visible')
  })

  it('greets the employee by name and states the leave year', () => {
    cy.get('h1').should('contain.text', 'David')
    cy.contains('Leave year 1 April to 31 March').should('be.visible')
    cy.contains('working days').should('not.exist')
  })

  it('reports figures that match the requests visible on My Requests', () => {
    const figures: Record<string, number> = {}

    statNumber('Remaining leave').then((value) => {
      figures.remaining = value
    })
    statNumber('Booked this year').then((value) => {
      figures.booked = value
    })
    statNumber('Pending approval').then((value) => {
      figures.pending = value
    })
    statNumber('Sick leave taken').then((value) => {
      figures.sick = value
    })
    cy.contains('[data-testid="stat-card"]', 'Remaining leave')
      .invoke('text')
      .then((text) => {
        figures.allowance = Number(text.match(/of (\d+) annual allowance/)![1])
      })

    cy.contains('a', 'View all').click()
    cy.url().should('include', '/requests')
    cy.get('[data-testid="screen-requests"]').should('be.visible')

    requestRows().then((rows) => {
      const leaveYear = getLeaveYear()
      const thisLeaveYear = rows.filter((row) =>
        isWithinLeaveYear(row.startDate, leaveYear)
      )
      const approved = thisLeaveYear.filter((row) => row.status === 'Approved')

      expect(figures.booked, 'days booked this year').to.equal(
        sumDays(approved)
      )
      expect(figures.remaining, 'remaining allowance').to.equal(
        figures.allowance - sumDays(approved)
      )
      expect(figures.pending, 'requests awaiting approval').to.equal(
        rows.filter((row) => row.status === 'Pending').length
      )
      expect(figures.sick, 'sick leave taken').to.equal(
        sumDays(approved.filter((row) => row.type === 'Sick'))
      )
    })
  })

  it('shows the most recent requests first and links to the full list', () => {
    requestRows().then((dashboardRows) => {
      const startDates = dashboardRows.map((row) => row.startDate)
      expect(startDates).to.deep.equal([...startDates].sort().reverse())
      expect(dashboardRows.length).to.be.at.most(5)

      cy.contains('a', 'View all').click()
      cy.get('[data-testid="screen-requests"]').should('be.visible')

      requestRows().then((allRows) => {
        const mostRecent = [...allRows]
          .sort((a, b) => b.startDate.localeCompare(a.startDate))
          .slice(0, dashboardRows.length)
        expect(dashboardRows.map((row) => row.startDate)).to.deep.equal(
          mostRecent.map((row) => row.startDate)
        )
      })
    })
  })
})
