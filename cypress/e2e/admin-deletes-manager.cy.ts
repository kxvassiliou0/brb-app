import {
  apiCreateUser,
  apiFirstIds,
  apiRemoveUsersByEmail,
  DESKTOP,
  login,
  USERS,
} from '../support/e2e'

const MANAGER_EMAIL = 'morgan.leaving@company.com'
const REPORT_EMAIL = 'reese.remaining@company.com'
const MANAGER = 'Morgan Leaving'
const REPORT = 'Reese Remaining'

function row(name: string) {
  return cy.contains('[data-testid="data-table"] tbody tr', name)
}

function openDeleteFor(name: string): void {
  row(name).contains('button', `Delete ${name}`).click()
  cy.get('[data-testid="delete-confirmation"]').should('be.visible')
}

describe('an Admin deleting a manager', () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    apiRemoveUsersByEmail([REPORT_EMAIL, MANAGER_EMAIL])
    apiFirstIds().then(({ departmentId, jobRoleId }) => {
      apiCreateUser({
        firstName: 'Morgan',
        lastName: 'Leaving',
        email: MANAGER_EMAIL,
        role: 'Manager',
        annualLeaveAllowance: 25,
        departmentId,
        jobRoleId,
      }).then((managerId) => {
        apiCreateUser({
          firstName: 'Reese',
          lastName: 'Remaining',
          email: REPORT_EMAIL,
          role: 'Employee',
          annualLeaveAllowance: 25,
          departmentId,
          jobRoleId,
          managerId,
        })
      })
    })

    cy.clearLocalStorage()
    login(USERS.admin, '/')
    cy.visit('/employees')
    cy.get('[data-testid="table-loading-state"]').should('not.exist')
  })

  afterEach(() => {
    apiRemoveUsersByEmail([REPORT_EMAIL, MANAGER_EMAIL])
  })

  it('states the consequences for that manager before anything is deleted', () => {
    openDeleteFor(MANAGER)

    cy.get('[data-testid="modal"]').within(() => {
      cy.contains(`Every leave request ${MANAGER} has made`).should('exist')
      cy.contains(`${REPORT} reports to ${MANAGER}`).should('exist')
      cy.contains('kept, but left without a line manager').should('exist')
      cy.contains('stay in the history').should('exist')
    })

    cy.contains('button', 'Keep Morgan Leaving').click()
    row(MANAGER).should('exist')
  })

  it('deletes nothing until the consequences are explicitly accepted', () => {
    openDeleteFor(MANAGER)

    cy.contains('button', `Delete ${MANAGER}`).should('be.disabled')
    cy.get('#delete-acknowledgement').check()
    cy.contains('button', `Delete ${MANAGER}`).should('not.be.disabled')
  })

  it('leaves the reports in place with no line manager', () => {
    row(REPORT)
      .find('[data-testid="employee-manager"]')
      .should('have.text', MANAGER)

    openDeleteFor(MANAGER)
    cy.get('#delete-acknowledgement').check()
    cy.get('[data-testid="modal"]')
      .contains('button', `Delete ${MANAGER}`)
      .click()

    cy.get('[data-testid="modal"]').should('not.exist')
    cy.contains('[data-testid="data-table"]', MANAGER).should('not.exist')
    row(REPORT)
      .find('[data-testid="employee-manager"]')
      .should('have.text', 'None')
  })
})

describe('an Admin deleting their own account', () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    cy.clearLocalStorage()
    login(USERS.admin, '/')
    cy.visit('/employees')
    cy.get('[data-testid="table-loading-state"]').should('not.exist')
  })

  it('offers no way to delete the account they are signed in as', () => {
    row('Alice Thompson')
      .contains('button', /^Delete Alice Thompson/)
      .should('be.disabled')
      .and('have.attr', 'title', 'You cannot delete your own account')

    cy.get('[data-testid="delete-confirmation"]').should('not.exist')
  })
})
