import { DESKTOP, login, USERS } from '../support/e2e'

const API_URL = Cypress.env('apiUrl') ?? 'http://localhost:3000'

const PASSWORD = 'Password123!'

const MARKER = 'Booked by the admin-books-for-employee spec'

const ON_BEHALF_OF = 'david.jones@company.com'

const ON_BEHALF_OF_NAME = 'David Jones'

const ROWS = '[data-testid="data-table"] tbody tr'

interface OwnRequest {
  id: number
  status: string
  reason: string | null
}

interface SeededUser {
  id: number
  email: string
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

function adminHeaders(): Cypress.Chainable<{ Authorization: string }> {
  return cy
    .request('POST', `${API_URL}/api/login`, {
      email: USERS.admin,
      password: PASSWORD,
    })
    .then((res) => ({ Authorization: `Bearer ${String(res.body)}` }))
}

function employeeIdFor(email: string): Cypress.Chainable<number> {
  return adminHeaders().then((headers) =>
    cy.request({ url: `${API_URL}/api/users`, headers }).then((res) => {
      const match = (res.body.data as SeededUser[]).find(
        (user) => user.email === email
      )
      expect(match, `seeded user ${email}`).to.not.equal(undefined)
      return match!.id
    })
  )
}

function cancelSpecRequests(email: string): void {
  adminHeaders().then((headers) => {
    employeeIdFor(email).then((employeeId) => {
      cy.request({
        url: `${API_URL}/api/leave-requests/status/${employeeId}`,
        headers,
      }).then((res) => {
        ;(res.body.data as OwnRequest[])
          .filter(
            (request) =>
              request.reason === MARKER &&
              request.status !== 'Cancelled' &&
              request.status !== 'Rejected'
          )
          .forEach((request) => {
            cy.request({
              method: 'DELETE',
              url: `${API_URL}/api/leave-requests`,
              headers,
              body: { leave_request_id: request.id, employee_id: employeeId },
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

describe('an admin booking leave on behalf of an employee', () => {
  const monthsAhead = 8
  const start = isoDate(monthsAhead, 9)
  const end = isoDate(monthsAhead, 10)

  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    cancelSpecRequests(ON_BEHALF_OF)
  })

  it('files the request under that employee, not the admin', () => {
    cy.clearLocalStorage()
    login(USERS.admin, '/')
    cy.get('[data-testid="sidebar"]').should('be.visible')
    cy.visit('/requests')
    cy.contains('h1', 'All requests').should('be.visible')

    cy.contains('button', 'Book time off').first().click()
    cy.get('[data-testid="modal"]').should('be.visible')

    cy.get('#booking-employee').find('option').should('have.length.at.least', 2)
    cy.get('#booking-employee').select(ON_BEHALF_OF_NAME)
    cy.get('#leave-type').select('Vacation')
    pickDate('start-date', start, monthsAhead)
    pickDate('end-date', end, monthsAhead)
    cy.get('#reason').type(MARKER)
    cy.contains('button', 'Send request').click()
    cy.get('[data-testid="modal"]').should('not.exist')

    cy.url().should('include', '/requests')
    cy.get('[data-testid="table-loading-state"]').should('not.exist')

    cy.contains(ROWS, displayDate(start)).within(() => {
      cy.contains(ON_BEHALF_OF_NAME).should('exist')
      cy.contains('Vacation').should('exist')
      cy.contains('Pending').should('exist')
    })

    cy.get('[data-testid="scope-filter"]')
      .contains('button', 'My requests')
      .click()
    cy.get('[data-testid="table-loading-state"]').should('not.exist')
    cy.get('[data-testid="data-table"]').should(
      'not.contain.text',
      displayDate(start)
    )
  })

  it('shows up under that employee’s own requests as Pending', () => {
    cy.clearLocalStorage()
    login(USERS.admin, '/')
    cy.get('[data-testid="sidebar"]').should('be.visible')
    cy.visit('/requests')

    cy.contains('button', 'Book time off').first().click()
    cy.get('[data-testid="modal"]').should('be.visible')
    cy.get('#booking-employee').find('option').should('have.length.at.least', 2)
    cy.get('#booking-employee').select(ON_BEHALF_OF_NAME)
    cy.get('#leave-type').select('Personal')
    pickDate('start-date', start, monthsAhead)
    pickDate('end-date', end, monthsAhead)
    cy.get('#reason').type(MARKER)
    cy.contains('button', 'Send request').click()
    cy.get('[data-testid="modal"]').should('not.exist')

    cy.contains('button', 'Sign out').click()
    cy.clearLocalStorage()
    login(ON_BEHALF_OF, '/')
    cy.get('[data-testid="sidebar"]').should('be.visible')
    cy.visit('/requests')
    cy.contains('h1', 'My requests').should('be.visible')
    cy.get('[data-testid="table-loading-state"]').should('not.exist')

    cy.contains(ROWS, displayDate(start)).within(() => {
      cy.contains('Personal').should('exist')
      cy.contains('Pending').should('exist')
    })
  })
})
