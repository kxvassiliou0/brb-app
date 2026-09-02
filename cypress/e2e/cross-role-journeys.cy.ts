import {
  API_URL,
  apiRemoveUsersByEmail,
  apiFirstIds,
  authHeaders,
  createRequestAs,
  DESKTOP,
  filterBy,
  isoDate,
  login,
  openRequests,
  PASSWORD,
  remainingDays,
  row,
  signOut,
  USERS,
} from '../support/e2e'

const NEW_STARTER = 'ivy.integration@company.com'

function markerFor(name: string): string {
  return `Booked by the ${name} journey`
}

function clearRequestsFor(email: string, marker: string): void {
  authHeaders(email).then((headers) => {
    cy.request({ url: `${API_URL}/api/users/me`, headers }).then((me) => {
      cy.request({
        url: `${API_URL}/api/leave-requests/status/${me.body.data.id}`,
        headers,
      }).then((res) => {
        const requests = res.body.data as { id: number; reason: string }[]
        requests
          .filter((request) => request.reason === marker)
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

describe('an employee books and a manager approves', () => {
  const marker = markerFor('approval')
  const start = isoDate(3, 10)
  const end = isoDate(3, 11)

  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    clearRequestsFor(USERS.employee, marker)
  })

  it('shows the employee the approval and the reduced balance', () => {
    createRequestAs(USERS.employee, start, end, marker).then((id) => {
      openRequests(USERS.employee)
      remainingDays().then((before) => {
        row(id).should('contain.text', 'Pending')
        signOut()

        openRequests(USERS.manager)
        row(id).should('exist')
        row(id).find('[data-testid="approve-request"]').click()

        cy.get(`[data-row-key="${id}"]`).should('not.exist')
        signOut()

        openRequests(USERS.employee)
        row(id).should('contain.text', 'Approved')
        remainingDays().should('be.lessThan', before)
      })
    })
  })
})

describe('an employee books and a manager declines', () => {
  const marker = markerFor('rejection')
  const note = 'Two of the team are already away that week.'
  const start = isoDate(9, 14)
  const end = isoDate(9, 15)

  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    clearRequestsFor(USERS.employee, marker)
  })

  it("carries the manager's note back to the employee", () => {
    createRequestAs(USERS.employee, start, end, marker).then((id) => {
      openRequests(USERS.manager)
      row(id).find('[data-testid="reject-request"]').click()

      cy.get('[data-testid="modal"]').should('be.visible')
      cy.get('#decline-note').type(note)
      cy.get('[data-testid="modal-primary"]').click()
      cy.get('[data-testid="modal"]').should('not.exist')

      cy.get(`[data-row-key="${id}"]`).should('not.exist')
      signOut()

      openRequests(USERS.employee)
      row(id).should('contain.text', 'Rejected')
      row(id).find('[data-testid="open-request"]').click()
      cy.get('[data-testid="modal"]').should('contain.text', note)
    })
  })
})

describe('an admin creates a user who then books leave', () => {
  const marker = markerFor('new starter')
  const start = isoDate(10, 6)
  const end = isoDate(10, 7)

  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    apiRemoveUsersByEmail([NEW_STARTER])
  })

  after(() => {
    apiRemoveUsersByEmail([NEW_STARTER])
  })

  it('lets the new starter sign in and shows the admin their request', () => {
    login(USERS.admin, '/')
    cy.visit('/employees')
    cy.get('[data-testid="screen-employees"]').should('be.visible')
    cy.get('[data-testid="add-employee"]').click()
    cy.get('[data-testid="modal"]').should('be.visible')

    cy.get('#employee-first-name').type('Ivy')
    cy.get('#employee-last-name').type('Integration')
    cy.get('#employee-email').type(NEW_STARTER)
    cy.get('#employee-password').type(PASSWORD)
    apiFirstIds().then(({ departmentId, jobRoleId }) => {
      cy.get('#employee-department').select(String(departmentId))
      cy.get('#employee-job-role').select(String(jobRoleId))
    })
    cy.get('[data-testid="modal-primary"]').click()
    cy.get('[data-testid="modal"]').should('not.exist')
    cy.contains('[data-testid="employee-name"]', 'Ivy Integration').should(
      'exist'
    )
    signOut()

    createRequestAs(NEW_STARTER, start, end, marker).then((id) => {
      openRequests(NEW_STARTER)
      row(id).should('contain.text', 'Pending')
      signOut()

      openRequests(USERS.admin)
      filterBy('scope-filter', 'all')
      filterBy('status-filter', 'Pending')
      row(id).should('exist').and('contain.text', 'Pending')
    })
  })
})

describe('an employee cancels a pending request', () => {
  const marker = markerFor('cancellation')
  const start = isoDate(11, 3)
  const end = isoDate(11, 4)

  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    clearRequestsFor(USERS.employee, marker)
  })

  it('takes it out of the manager queue and restores the balance', () => {
    createRequestAs(USERS.employee, start, end, marker).then((id) => {
      openRequests(USERS.manager)
      row(id).should('exist')
      signOut()

      openRequests(USERS.employee)
      remainingDays().then((before) => {
        row(id).find('[data-testid="cancel-request"]').click()
        cy.get('[data-testid="modal"]').should('be.visible')
        cy.get('[data-testid="modal-primary"]').click()
        cy.get('[data-testid="modal"]').should('not.exist')

        row(id).should('contain.text', 'Cancelled')
        remainingDays().should('equal', before)
        signOut()

        openRequests(USERS.manager)
        cy.get(`[data-row-key="${id}"]`).should('not.exist')
      })
    })
  })
})

describe('a manager books their own leave', () => {
  const marker = markerFor('manager self service')
  const start = isoDate(12, 8)
  const end = isoDate(12, 9)

  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    clearRequestsFor(USERS.manager, marker)
  })

  it('sends it to their own line manager and keeps it out of their queue', () => {
    createRequestAs(USERS.manager, start, end, marker).then((id) => {
      openRequests(USERS.manager)
      filterBy('scope-filter', 'all')
      cy.get(`[data-row-key="${id}"]`).should('not.exist')

      filterBy('scope-filter', 'mine')
      row(id).should('contain.text', 'Pending')
      signOut()

      openRequests(USERS.managersManager)
      row(id).should('exist').and('contain.text', 'Bob Mitchell')
    })
  })
})
