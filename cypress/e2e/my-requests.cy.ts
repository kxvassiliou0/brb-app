import { DESKTOP, login, USERS } from '../support/e2e'

const API_URL = Cypress.env('apiUrl') ?? 'http://localhost:3000'

const PASSWORD = 'Password123!'

const ROWS = '[data-testid="data-table"] tbody:not([data-testid]) tr'

const STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled'] as const

const COLLEAGUES = [
  'Eve Knowles',
  'Frank Harrison',
  'Grace Williams',
  'Bob Mitchell',
]

interface OwnRequest {
  id: number
  leave_type: string
  days_requested: number
  status: (typeof STATUSES)[number]
  manager_note: string | null
}

function tokenFor(email: string): Cypress.Chainable<string> {
  return cy
    .request('POST', `${API_URL}/api/login`, { email, password: PASSWORD })
    .then((res) => String(res.body))
}

function ownRequests(): Cypress.Chainable<OwnRequest[]> {
  return tokenFor(USERS.employee).then((token) => {
    const headers = { Authorization: `Bearer ${token}` }
    return cy
      .request({ url: `${API_URL}/api/users/me`, headers })
      .then((me) =>
        cy.request({
          url: `${API_URL}/api/leave-requests/status/${me.body.data.id}`,
          headers,
        })
      )
      .then((res) => res.body.data as OwnRequest[])
  })
}

function countByStatus(requests: OwnRequest[], status: string): number {
  return requests.filter((request) => request.status === status).length
}

function openMyRequests(): void {
  login(USERS.employee, '/')
  cy.get('[data-testid="screen-employee-dashboard"]').should('be.visible')
  cy.visit('/requests')
  cy.contains('h1', 'My requests').should('be.visible')
  cy.get('[data-testid="table-loading-state"]').should('not.exist')
}

describe('my leave requests', () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
  })

  it('lists every request the API returns for the signed-in employee', () => {
    openMyRequests()

    ownRequests().then((mine) => {
      expect(mine).to.have.length.at.least(1)
      cy.get(ROWS).should('have.length', mine.length)
    })
  })

  it("shows no colleague's request and offers no way to ask for one", () => {
    openMyRequests()

    cy.get('[data-testid="data-table"]').then(($table) => {
      COLLEAGUES.forEach((name) => expect($table.text()).not.to.contain(name))
    })
    cy.get('[data-testid="data-table"] thead').should(
      'not.contain.text',
      'Employee'
    )
    cy.get('[data-testid="scope-filter"]').should('not.exist')
  })

  it("refuses a direct read of a colleague's requests", () => {
    tokenFor(USERS.admin).then((adminToken) => {
      cy.request({
        url: `${API_URL}/api/users`,
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((users) => {
        const colleague = users.body.data.find(
          (user: { email: string }) => user.email !== USERS.employee
        )

        tokenFor(USERS.employee).then((employeeToken) => {
          cy.request({
            url: `${API_URL}/api/leave-requests/status/${colleague.id}`,
            headers: { Authorization: `Bearer ${employeeToken}` },
            failOnStatusCode: false,
          })
            .its('status')
            .should('eq', 403)
        })
      })
    })
  })

  it('opens the whole request from its leftmost column', () => {
    openMyRequests()

    ownRequests().then((mine) => {
      const first = mine[0]!
      cy.get(`${ROWS} td:first-child button`).first().click()

      cy.get('[data-testid="modal"]').within(() => {
        cy.contains('h2', `${first.leave_type} leave`).should('be.visible')
        cy.contains('dt', 'Dates').should('be.visible')
        cy.contains('dt', 'Duration')
          .next('dd')
          .should('contain.text', String(first.days_requested))
        cy.contains('dt', 'Status').next('dd').should('have.text', first.status)
        cy.contains('button', 'Close').click()
      })

      cy.get('[data-testid="modal"]').should('not.exist')
    })
  })

  it("carries the manager's note at the foot of a rejected request", () => {
    openMyRequests()

    ownRequests().then((mine) => {
      const rejected = mine.find(
        (request) => request.status === 'Rejected' && request.manager_note
      )
      expect(
        rejected,
        'a seeded rejection carries a manager note'
      ).to.not.equal(undefined)

      cy.contains('[data-testid="status-filter"] button', 'Rejected').click()
      cy.get('[data-testid="manager-note"]').should('not.exist')

      cy.get(`${ROWS} td:first-child button`).first().click()
      cy.get('[data-testid="manager-note"]')
        .should('be.visible')
        .and('contain.text', rejected!.manager_note)
    })
  })

  describe('the status tabs', () => {
    it('counts out the rows for every status and brings them all back', () => {
      openMyRequests()

      ownRequests().then((mine) => {
        STATUSES.forEach((status) => {
          const expected = countByStatus(mine, status)
          cy.contains('[data-testid="status-filter"] button', status).click()

          if (expected === 0) {
            cy.get(ROWS).should('not.exist')
            cy.get('[data-testid="table-empty-state"]').should(
              'contain.text',
              'No requests match these filters.'
            )
          } else {
            cy.get(ROWS).should('have.length', expected)
            cy.get(ROWS).each((row) =>
              cy.wrap(row).should('contain.text', status)
            )
          }
        })

        cy.contains('[data-testid="status-filter"] button', 'All').click()
        cy.get(ROWS).should('have.length', mine.length)
      })
    })

    it('keeps a Cancelled tab, so cancellations are never hidden', () => {
      openMyRequests()

      cy.get('[data-testid="status-filter"] button').should(($tabs) => {
        const labels = $tabs.toArray().map((tab) => tab.textContent?.trim())
        expect(labels).to.deep.equal(['All', ...STATUSES])
      })
    })
  })
})
