import { API_URL, authHeaders, DESKTOP, login, USERS } from '../support/e2e'

const MARKER = 'Booked by the book-time-off spec'

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

function cancelSpecRequests(): void {
  authHeaders(USERS.employee).then((headers) => {
    cy.request({ url: `${API_URL}/api/users/me`, headers }).then((me) => {
      const employeeId = me.body.data.id
      cy.request({
        url: `${API_URL}/api/leave-requests/status/${employeeId}`,
        headers,
      }).then((res) => {
        const mine: OwnRequest[] = res.body.data
        mine
          .filter(
            (request) =>
              request.reason === MARKER && request.status !== 'Cancelled'
          )
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
    })
  })
}

function openBookingModal(): void {
  cy.contains('button', 'Book time off').first().click()
  cy.get('[data-testid="modal"]').should('be.visible')
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

describe('booking time off', () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    cancelSpecRequests()
    login(USERS.employee, '/')
    cy.get('[data-testid="screen-employee-dashboard"]').should('be.visible')
  })

  it('books a request and arrives on My requests with the new row highlighted', () => {
    const monthsAhead = 2
    const start = isoDate(monthsAhead, 12)
    const end = isoDate(monthsAhead, 13)

    openBookingModal()
    cy.get('#leave-type').select('Vacation')
    pickDate('start-date', start, monthsAhead)
    pickDate('end-date', end, monthsAhead)

    cy.get('[data-testid="booking-summary"]').should('contain.text', '2 days')
    cy.get('[data-testid="booking-remaining"]').should(
      'contain.text',
      'remaining after this request'
    )

    cy.get('#reason').type(MARKER)
    cy.contains('button', 'Send request').click()

    cy.get('[data-testid="modal"]').should('not.exist')

    cy.url().should('include', '/requests')
    cy.get('[data-testid="screen-requests"]').should('be.visible')

    cy.get('[data-testid="booking-confirmation-region"]')
      .should('have.attr', 'role', 'status')
      .and('have.attr', 'aria-live', 'polite')
    cy.get('[data-testid="booking-confirmation"]').should(
      'contain.text',
      'submitted for review'
    )

    cy.get('[data-testid="data-table"] tbody tr[data-highlighted="true"]')
      .should('have.length', 1)
      .within(() => {
        cy.contains(displayDate(start)).should('exist')
        cy.contains('Vacation').should('exist')
        cy.contains('Pending').should('exist')
        cy.contains('2').should('exist')
      })
  })

  it('keeps the entered dates and reason when the server refuses', () => {
    const monthsAhead = 3
    const start = isoDate(monthsAhead, 1)
    const end = isoDate(monthsAhead, 26)

    openBookingModal()
    cy.get('#leave-type').select('Personal')
    pickDate('start-date', start, monthsAhead)
    pickDate('end-date', end, monthsAhead)
    cy.get('#reason').type(MARKER)
    cy.contains('button', 'Send request').click()

    cy.get('[role="alert"]').should('be.visible')
    cy.get('[data-testid="modal"]').should('be.visible')

    cy.get('#leave-type').should('have.value', 'Personal')
    cy.get('#start-date').should('contain.text', displayDate(start))
    cy.get('#end-date').should('contain.text', displayDate(end))
    cy.get('#reason').should('have.value', MARKER)

    cy.url().should('not.include', '/requests')
  })

  it('refuses a range longer than the balance and shows the balance figure', () => {
    const monthsAhead = 3
    const start = isoDate(monthsAhead, 1)
    const end = isoDate(monthsAhead, 26)

    cy.contains('[data-testid="stat-card"]', 'Remaining leave')
      .find('[data-testid="stat-value"]')
      .invoke('text')
      .then((text) => {
        const remaining = Number.parseInt(text, 10)

        openBookingModal()
        cy.get('#leave-type').select('Vacation')
        pickDate('start-date', start, monthsAhead)
        pickDate('end-date', end, monthsAhead)
        cy.get('#reason').type(MARKER)
        cy.contains('button', 'Send request').click()

        cy.get('[role="alert"]')
          .should('be.visible')
          .and('contain.text', `${remaining} days remaining`)
        cy.get('[data-testid="modal"]').should('be.visible')
      })
  })

  it('disables a public holiday in the picker', () => {
    const monthsAhead = 4
    const holidayDate = isoDate(monthsAhead, 20)

    authHeaders(USERS.admin).then((headers) => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/api/public-holidays`,
        headers,
        body: { date: holidayDate, name: 'Spec Holiday' },
        failOnStatusCode: false,
      }).then((created) => {
        const holidayId = created.body?.id

        cy.reload()
        openBookingModal()
        cy.get('#start-date').click()
        for (let step = 0; step < monthsAhead; step += 1) {
          cy.get('[data-testid="start-date-calendar"]')
            .find('button[aria-label="Next month"]')
            .click()
        }
        cy.get(
          `[data-testid="start-date-calendar"] [data-testid="calendar-day"][data-date="${holidayDate}"]`
        )
          .should('be.disabled')
          .and('have.attr', 'title', 'Spec Holiday (public holiday)')

        if (holidayId) {
          cy.request({
            method: 'DELETE',
            url: `${API_URL}/api/public-holidays/${holidayId}`,
            headers,
            failOnStatusCode: false,
          })
        }
      })
    })
  })
})
