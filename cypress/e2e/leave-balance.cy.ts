import { DESKTOP, login, USERS } from '../support/e2e'

const API_URL = Cypress.env('apiUrl') ?? 'http://localhost:3000'

const PASSWORD = 'Password123!'

const MARKER = 'Booked by the leave-balance spec'

const MONTHS_AHEAD = 5

const ROWS = '[data-testid="data-table"] tbody tr'

interface OwnRequest {
  id: number
  start_date: string
  days_requested: number
  status: string
  reason: string | null
}

function isoDate(dayOfMonth: number): string {
  const today = new Date()
  const target = new Date(
    Date.UTC(today.getFullYear(), today.getMonth() + MONTHS_AHEAD, dayOfMonth)
  )
  return target.toISOString().slice(0, 10)
}

function displayDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function tokenFor(email: string): Cypress.Chainable<string> {
  return cy
    .request('POST', `${API_URL}/api/login`, { email, password: PASSWORD })
    .then((res) => String(res.body))
}

function specRequests(
  callback: (requests: OwnRequest[], headers: object) => void
): void {
  tokenFor(USERS.employee).then((token) => {
    const headers = { Authorization: `Bearer ${token}` }
    cy.request({ url: `${API_URL}/api/users/me`, headers }).then((me) => {
      cy.request({
        url: `${API_URL}/api/leave-requests/status/${me.body.data.id}`,
        headers,
      }).then((res) => {
        const mine: OwnRequest[] = res.body.data
        callback(
          mine.filter((request) => request.reason === MARKER),
          headers
        )
      })
    })
  })
}

function cancelSpecRequests(): void {
  specRequests((requests, headers) => {
    requests
      .filter((request) => request.status !== 'Cancelled')
      .forEach((request) => {
        cy.request({
          method: 'DELETE',
          url: `${API_URL}/api/leave-requests`,
          headers,
          body: { leave_request_id: request.id },
          failOnStatusCode: false,
        })
      })
  })
}

function statNumber(label: string): Cypress.Chainable<number> {
  return cy
    .contains('[data-testid="stat-card"]', label)
    .find('[data-testid="stat-value"]')
    .invoke('text')
    .then((text) => Number.parseInt(text, 10))
}

function allowance(): Cypress.Chainable<number> {
  return cy
    .contains('[data-testid="stat-card"]', 'Remaining leave')
    .invoke('text')
    .then((text) => Number(text.match(/of (\d+) annual allowance/)![1]))
}

function openDashboard(email: string): void {
  cy.clearLocalStorage()
  login(email, '/')
  cy.get('[data-testid="screen-employee-dashboard"]').should('be.visible')
}

function pickDate(pickerId: string, iso: string): void {
  cy.get(`#${pickerId}`).click()
  for (let step = 0; step < MONTHS_AHEAD; step += 1) {
    cy.get(`[data-testid="${pickerId}-calendar"]`)
      .find('button[aria-label="Next month"]')
      .click()
  }
  cy.get(
    `[data-testid="${pickerId}-calendar"] [data-testid="calendar-day"][data-date="${iso}"]`
  ).click()
}

function bookLeave(start: string, end: string): void {
  cy.contains('button', 'Book time off').first().click()
  cy.get('[data-testid="modal"]').should('be.visible')
  cy.get('#leave-type').select('Vacation')
  pickDate('start-date', start)
  pickDate('end-date', end)
  cy.get('#reason').type(MARKER)
  cy.contains('button', 'Send request').click()
  cy.get('[data-testid="modal"]').should('not.exist')
  cy.url().should('include', '/requests')
}

function approveAsManager(start: string): void {
  cy.clearLocalStorage()
  login(USERS.manager, '/')
  cy.get('[data-testid="screen-manager-dashboard"]').should('be.visible')
  cy.visit('/requests')
  cy.contains('h1', 'Team requests').should('be.visible')
  cy.get('[data-testid="table-loading-state"]').should('not.exist')

  cy.get(ROWS)
    .filter(`:contains("${displayDate(start)}")`)
    .should('have.length', 1)
    .within(() => {
      cy.contains('button', 'Approve').click()
    })

  cy.get('[data-testid="table-loading-state"]').should('not.exist')
  cy.get('[data-testid="data-table"]').should(
    'not.contain.text',
    displayDate(start)
  )
}

describe('the annual leave balance', () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    cancelSpecRequests()
  })

  after(cancelSpecRequests)

  it('drops by the days approved and stays whole against the entitlement', () => {
    const start = isoDate(7)
    const end = isoDate(9)
    const before = { remaining: 0, used: 0, allowance: 0 }
    const booked = { days: 0 }

    openDashboard(USERS.employee)
    statNumber('Remaining leave').then((value) => {
      before.remaining = value
    })
    statNumber('Booked this year').then((value) => {
      before.used = value
    })
    allowance().then((value) => {
      before.allowance = value
    })

    bookLeave(start, end)

    specRequests((requests) => {
      const pending = requests.find((request) => request.start_date === start)!
      booked.days = pending.days_requested
      expect(pending.status, 'status once booked').to.equal('Pending')
    })

    openDashboard(USERS.employee)
    statNumber('Remaining leave').then((remaining) => {
      expect(remaining, 'a pending request spends nothing').to.equal(
        before.remaining
      )
    })

    approveAsManager(start)

    openDashboard(USERS.employee)
    statNumber('Remaining leave').then((remaining) => {
      expect(remaining, 'remaining after approval').to.equal(
        before.remaining - booked.days
      )
    })
    statNumber('Booked this year').then((used) => {
      expect(used, 'days used after approval').to.equal(
        before.used + booked.days
      )
    })
    allowance().then((total) => {
      expect(total, 'entitlement is unchanged').to.equal(before.allowance)
    })
    statNumber('Remaining leave').then((remaining) => {
      statNumber('Booked this year').then((used) => {
        expect(used + remaining, 'used plus remaining').to.equal(
          before.allowance
        )
      })
    })
  })
})
