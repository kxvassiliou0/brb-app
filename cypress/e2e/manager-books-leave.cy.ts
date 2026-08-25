import { DESKTOP, login, USERS } from '../support/e2e'

const API_URL = Cypress.env('apiUrl') ?? 'http://localhost:3000'

const PASSWORD = 'Password123!'

const MARKER = 'Booked by the manager-books-leave spec'

const LINE_MANAGER = 'carol.reeves@company.com'

interface OwnRequest {
  id: number
  start_date: string
  end_date: string
  status: string
  reason: string | null
}

function isoDate(monthsAhead: number, dayOfMonth: number): string {
  const today = new Date()
  const target = new Date(
    Date.UTC(today.getFullYear(), today.getMonth() + monthsAhead, dayOfMonth)
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

function cancelSpecRequests(): void {
  tokenFor(USERS.manager).then((token) => {
    const headers = { Authorization: `Bearer ${token}` }
    cy.request({ url: `${API_URL}/api/users/me`, headers }).then((me) => {
      cy.request({
        url: `${API_URL}/api/leave-requests/status/${me.body.data.id}`,
        headers,
      }).then((res) => {
        ;(res.body.data as OwnRequest[])
          .filter((r) => r.reason === MARKER && r.status !== 'Cancelled')
          .forEach((r) => {
            cy.request({
              method: 'DELETE',
              url: `${API_URL}/api/leave-requests`,
              headers,
              body: { leave_request_id: r.id },
              failOnStatusCode: false,
            })
          })
      })
    })
  })
}

function pickDate(pickerId: string, iso: string, monthsAhead: number): void {
  cy.get(`#${pickerId}`).click()
  for (let step = 0; step < monthsAhead; step += 1) {
    cy.get(`[data-testid="${pickerId}-calendar"]`)
      .find('button[aria-label="Next month"]')
      .click()
  }
  cy.get(
    `[data-testid="${pickerId}-calendar"] [data-testid="calendar-day"][data-date="${iso}"]`
  ).click()
}

function bookAsManager(start: string, end: string, monthsAhead: number): void {
  cy.contains('button', 'Book time off').first().click()
  cy.get('[data-testid="modal"]').should('be.visible')
  cy.get('#leave-type').select('Vacation')
  pickDate('start-date', start, monthsAhead)
  pickDate('end-date', end, monthsAhead)
  cy.get('#reason').type(MARKER)
  cy.contains('button', 'Send request').click()
  cy.get('[data-testid="modal"]').should('not.exist')
}

describe('a manager booking their own leave', () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    cancelSpecRequests()
  })

  it('books from the dashboard and lists it under My requests as Pending', () => {
    const monthsAhead = 5
    const start = isoDate(monthsAhead, 9)
    const end = isoDate(monthsAhead, 10)

    login(USERS.manager, '/')
    cy.get('[data-testid="screen-manager-dashboard"]').should('be.visible')

    bookAsManager(start, end, monthsAhead)

    cy.url().should('include', '/requests')
    cy.get('[data-testid="booking-confirmation"]')
      .should('be.visible')
      .and('contain.text', 'submitted for review')

    cy.get('[data-testid="scope-filter"]')
      .contains('button', 'My requests')
      .click()

    cy.contains(
      '[data-testid="data-table"] tbody tr',
      displayDate(start)
    ).within(() => {
      cy.contains('Vacation').should('exist')
      cy.contains('Pending').should('exist')
    })
  })

  it("lands in the line manager's queue, not the requester's own", () => {
    const monthsAhead = 6
    const start = isoDate(monthsAhead, 9)
    const end = isoDate(monthsAhead, 10)

    login(USERS.manager, '/')
    cy.visit('/requests')
    bookAsManager(start, end, monthsAhead)

    cy.get('[data-testid="scope-filter"]').contains('button', 'All').click()
    cy.get('[data-testid="data-table"]').should(
      'not.contain.text',
      displayDate(start)
    )

    cy.contains('button', 'Sign out').click()
    login(LINE_MANAGER, '/')
    cy.visit('/requests')

    cy.contains(
      '[data-testid="data-table"] tbody tr',
      displayDate(start)
    ).within(() => {
      cy.contains('Bob Mitchell').should('exist')
      cy.contains('Pending').should('exist')
      cy.contains('button', 'Approve').should('exist')
    })
  })
})
