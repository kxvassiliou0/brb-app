import { DESKTOP, login, USERS } from '../support/e2e'

const TABLE = '[data-testid="data-table"]'

const ROWS = `${TABLE} tbody:not([data-testid]) tr`

interface RequestRow {
  employee: string
  startDate: string
  endDate: string
  requested: string
  status: string
}

function toKey(displayed: string): string {
  const parsed = new Date(displayed.trim())
  if (Number.isNaN(parsed.getTime())) return ''
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${parsed.getFullYear()}-${month}-${day}`
}

function today(): string {
  return toKey(new Date().toDateString())
}

function statNumber(label: string): Cypress.Chainable<number> {
  return cy
    .contains('[data-testid="stat-card"]', label)
    .find('[data-testid="stat-value"]')
    .invoke('text')
    .then((text) => Number.parseInt(text, 10))
}

function statHint(label: string): Cypress.Chainable<string> {
  return cy
    .contains('[data-testid="stat-card"]', label)
    .find('[data-testid="stat-hint"]')
    .invoke('text')
}

function allRequestRows(): Cypress.Chainable<RequestRow[]> {
  return cy.get(`${TABLE} thead th`).then(($headers) => {
    const headings = Cypress._.map($headers, (th) =>
      (th as HTMLElement).innerText.trim()
    )
    const index = (name: string) => headings.indexOf(name)

    return cy.get(ROWS).then(($rows) =>
      Cypress._.map($rows, (row) => {
        const cells = Cypress.$(row)
          .find('td')
          .toArray()
          .map((cell) => cell.innerText.trim())
        const dates = (cells[index('Dates')] ?? '').split('–')
        return {
          employee: cells[index('Employee')] ?? '',
          startDate: toKey(dates[0] ?? ''),
          endDate: toKey(dates[dates.length - 1] ?? ''),
          requested: toKey(cells[index('Date requested')] ?? ''),
          status: cells[index('Status')] ?? '',
        }
      })
    )
  })
}

describe('admin dashboard', () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    login(USERS.admin, '/')
    cy.get('[data-testid="screen-admin-dashboard"]').should('be.visible')
  })

  it('greets the admin and charges leave in calendar days', () => {
    cy.get('h1').should('contain.text', 'Alice')
    cy.contains('your organisation at a glance').should('be.visible')
    cy.contains('working days').should('not.exist')
    cy.contains('[data-testid="stat-card"]', 'Avg leave taken').should(
      'contain.text',
      'days'
    )
  })

  it('breaks the company total down by department', () => {
    cy.get('[data-testid="leave-by-department"]').should('be.visible')
    cy.get('[data-testid="department-leave"]')
      .should('have.length.greaterThan', 0)
      .each(($row) => {
        expect($row.text()).to.match(/\d+ days?$/)
      })
  })

  it('reports totals that reconcile with the All Requests table', () => {
    const figures: Record<string, number> = {}

    statNumber('Requests this month').then((value) => {
      figures.requestsThisMonth = value
    })
    statHint('Requests this month').then((text) => {
      figures.pending = Number(text.match(/(\d+) still pending/)![1])
    })
    statNumber('On leave today').then((value) => {
      figures.onLeaveToday = value
    })
    statNumber('Total employees').then((value) => {
      figures.employees = value
    })

    cy.contains('nav a', 'Requests').click()
    cy.get('[data-testid="screen-requests"]').should('be.visible')
    cy.contains('[data-testid="scope-filter"] button', 'All').click()

    allRequestRows().then((rows) => {
      const month = today().slice(0, 7)
      const raisedThisMonth = rows.filter((row) =>
        row.requested.startsWith(month)
      )
      const onLeave = new Set(
        rows
          .filter(
            (row) =>
              row.status === 'Approved' &&
              row.startDate <= today() &&
              row.endDate >= today()
          )
          .map((row) => row.employee)
      )
      const everyone = new Set(rows.map((row) => row.employee))

      expect(figures.requestsThisMonth, 'requests raised this month').to.equal(
        raisedThisMonth.length
      )
      expect(figures.pending, 'still awaiting a decision').to.equal(
        raisedThisMonth.filter((row) => row.status === 'Pending').length
      )
      expect(figures.onLeaveToday, 'people away today').to.equal(onLeave.size)
      expect(figures.employees, 'total employees').to.be.at.least(everyone.size)
    })
  })
})
