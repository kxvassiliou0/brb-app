import { API_URL, authHeaders, DESKTOP, login, USERS } from '../support/e2e'

const MARKER = 'Booked by the cancel-request spec'

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

function cancelSpecRequests(email: string): void {
  authHeaders(email).then((headers) => {
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

function seedPendingRequest(
  email: string,
  start: string,
  end: string
): Cypress.Chainable<number> {
  return authHeaders(email).then((headers) =>
    cy
      .request({
        method: 'POST',
        url: `${API_URL}/api/leave-requests`,
        headers,
        body: {
          start_date: start,
          end_date: end,
          leave_type: 'Vacation',
          reason: MARKER,
        },
      })
      .then((res) => Number(res.body.data.id))
  )
}

function signInAndOpenRequests(email: string): void {
  login(email, '/')
  cy.get('[data-testid="sidebar"]').should('be.visible')
  cy.visit('/requests')
  cy.get('[data-testid="screen-requests"]').should('be.visible')
}

function statusTab(name: string): void {
  cy.get('[data-testid="status-filter"]').contains('button', name).click()
}

function remainingDays(): Cypress.Chainable<number> {
  return cy
    .contains('[data-testid="screen-requests"] p', 'days remaining')
    .invoke('text')
    .then((text) => {
      const match = /(\d+) days remaining/.exec(text)
      expect(match, 'balance is shown in the page description').to.not.equal(
        null
      )
      return Number(match?.[1])
    })
}

describe('cancelling a leave request', () => {
  const monthsAhead = 7
  const start = isoDate(monthsAhead, 14)
  const end = isoDate(monthsAhead, 15)

  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    cancelSpecRequests(USERS.employee)
  })

  it('moves the request to the Cancelled tab and leaves the balance intact', () => {
    seedPendingRequest(USERS.employee, start, end)

    signInAndOpenRequests(USERS.employee)

    remainingDays().then((before) => {
      cy.contains('[data-testid="data-table"] tbody tr', displayDate(start))
        .should('contain.text', 'Pending')
        .within(() => {
          cy.contains('button', 'Cancel request').click()
        })

      cy.get('[data-testid="confirm-dialog"]')
        .should('be.visible')
        .and('contain.text', displayDate(start))
      cy.get('[role="dialog"]').should('have.attr', 'aria-modal', 'true')

      cy.contains('[data-testid="confirm-dialog"] button', 'Confirm').click()
      cy.get('[data-testid="confirm-dialog"]').should('not.exist')

      cy.contains(
        '[data-testid="data-table"] tbody tr',
        displayDate(start)
      ).should('contain.text', 'Cancelled')

      statusTab('Pending')
      cy.get('[data-testid="data-table"]').should(
        'not.contain.text',
        displayDate(start)
      )

      statusTab('Cancelled')
      cy.contains(
        '[data-testid="data-table"] tbody tr',
        displayDate(start)
      ).should('contain.text', 'Cancelled')

      remainingDays().should('equal', before)
    })
  })

  it('keeps the request when the confirmation is dismissed', () => {
    seedPendingRequest(USERS.employee, start, end)

    signInAndOpenRequests(USERS.employee)

    cy.contains(
      '[data-testid="data-table"] tbody tr',
      displayDate(start)
    ).within(() => {
      cy.contains('button', 'Cancel request').click()
    })

    cy.contains('[data-testid="confirm-dialog"] button', 'Keep request').click()

    cy.get('[data-testid="confirm-dialog"]').should('not.exist')
    cy.contains(
      '[data-testid="data-table"] tbody tr',
      displayDate(start)
    ).should('contain.text', 'Pending')
  })

  it("leaves the manager's approval queue once cancelled", () => {
    const queueStart = isoDate(monthsAhead, 20)
    const queueEnd = isoDate(monthsAhead, 21)

    seedPendingRequest(USERS.employee, queueStart, queueEnd)

    signInAndOpenRequests(USERS.manager)
    statusTab('Pending')
    cy.contains(
      '[data-testid="data-table"] tbody tr',
      displayDate(queueStart)
    ).should('contain.text', 'David Jones')

    cy.contains('button', 'Sign out').click()

    signInAndOpenRequests(USERS.employee)
    cy.contains(
      '[data-testid="data-table"] tbody tr',
      displayDate(queueStart)
    ).within(() => {
      cy.contains('button', 'Cancel request').click()
    })
    cy.contains('[data-testid="confirm-dialog"] button', 'Confirm').click()
    cy.get('[data-testid="confirm-dialog"]').should('not.exist')

    cy.contains('button', 'Sign out').click()

    signInAndOpenRequests(USERS.manager)
    statusTab('Pending')
    cy.get('[data-testid="data-table"]').should(
      'not.contain.text',
      displayDate(queueStart)
    )
  })
})
