import { DESKTOP, login, USERS } from '../support/e2e'

const API_URL = Cypress.env('apiUrl') ?? 'http://localhost:3000'

const PASSWORD = 'Password123!'

const MARKER = 'Booked by the admin-approves-any-request spec'

const OUTSIDE_REPORTING_LINE = 'grace.williams@company.com'

const OUTSIDE_REPORTING_NAME = 'Grace Williams'

const ADMIN_NAME = 'Alice Thompson'

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
              body: {
                leave_request_id: request.id,
                employee_id: employeeId,
              },
              failOnStatusCode: false,
            })
          })
      })
    })
  })
}

function createPendingFor(email: string, start: string, end: string): void {
  adminHeaders().then((headers) => {
    employeeIdFor(email).then((employeeId) => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/api/leave-requests`,
        headers,
        body: {
          employee_id: employeeId,
          start_date: start,
          end_date: end,
          leave_type: 'Vacation',
          reason: MARKER,
        },
      })
    })
  })
}

function openRequests(email: string): void {
  cy.clearLocalStorage()
  login(email, '/')
  cy.get('[data-testid="sidebar"]').should('be.visible')
  cy.visit('/requests')
  cy.get('[data-testid="table-loading-state"]').should('not.exist')
}

describe('an admin reviewing a request outside their reporting line', () => {
  const monthsAhead = 7
  const start = isoDate(monthsAhead, 9)
  const end = isoDate(monthsAhead, 10)

  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    cancelSpecRequests(OUTSIDE_REPORTING_LINE)
    createPendingFor(OUTSIDE_REPORTING_LINE, start, end)
  })

  it('approves it, and the employee sees the decision and the reviewer', () => {
    openRequests(USERS.admin)
    cy.contains('h1', 'All requests').should('be.visible')

    cy.contains(ROWS, displayDate(start)).within(() => {
      cy.contains(OUTSIDE_REPORTING_NAME).should('exist')
      cy.contains('Pending').should('exist')
      cy.contains('button', 'Approve').click()
    })

    cy.get('[data-testid="table-loading-state"]').should('not.exist')
    cy.contains(ROWS, displayDate(start)).within(() => {
      cy.contains('Approved').should('exist')
      cy.contains(ADMIN_NAME).should('exist')
    })

    openRequests(OUTSIDE_REPORTING_LINE)
    cy.contains('h1', 'My requests').should('be.visible')

    cy.contains(ROWS, displayDate(start)).within(() => {
      cy.contains('Vacation').should('exist')
      cy.contains('Approved').should('exist')
    })
  })

  it('reaches an employee no manager queue covers', () => {
    openRequests(USERS.manager)
    cy.contains('h1', 'Team requests').should('be.visible')

    cy.get('[data-testid="data-table"]').should(
      'not.contain.text',
      OUTSIDE_REPORTING_NAME
    )

    openRequests(USERS.admin)
    cy.contains(ROWS, displayDate(start)).should(
      'contain.text',
      OUTSIDE_REPORTING_NAME
    )
  })
})
