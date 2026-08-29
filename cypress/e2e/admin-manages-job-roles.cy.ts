import {
  apiRemoveJobRolesByName,
  apiRemoveUsersByEmail,
  DESKTOP,
  login,
  USERS,
} from '../support/e2e'

const JOB_ROLE = 'Solutions Architect'
const EMAIL = 'quinn.architect@company.com'
const PASSWORD = 'Password123!'

function jobRoles() {
  return cy.get('[data-testid="jobRole-section"]')
}

function jobRoleCard(name: string) {
  return jobRoles().contains('[data-testid="org-unit-card"]', name)
}

function addJobRole(name: string): void {
  jobRoles().contains('button', 'Add a job role').click()
  cy.get('[data-testid="jobRole-form"]').should('be.visible')
  cy.get('#jobRole-name').type(name)
  cy.get('[data-testid="modal"]').contains('button', 'Add a job role').click()
  cy.get('[data-testid="modal"]').should('not.exist')
}

function visitDepartments(): void {
  cy.visit('/departments')
  cy.get('[data-testid="screen-departments"]').should('be.visible')
  jobRoles().find('[data-testid="org-unit-card"]').should('exist')
}

describe('an Admin managing job roles', () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    apiRemoveUsersByEmail([EMAIL])
    apiRemoveJobRolesByName([JOB_ROLE])

    cy.clearLocalStorage()
    login(USERS.admin, '/')
    cy.get('[data-testid="screen-admin-dashboard"]').should('be.visible')
    visitDepartments()
  })

  afterEach(() => {
    apiRemoveUsersByEmail([EMAIL])
    apiRemoveJobRolesByName([JOB_ROLE])
  })

  it('refuses to delete a job role once somebody has been assigned to it', () => {
    addJobRole(JOB_ROLE)

    jobRoleCard(JOB_ROLE)
      .find('[data-testid="org-unit-user-count"]')
      .should('have.text', '0')

    cy.visit('/employees')
    cy.get('[data-testid="table-loading-state"]').should('not.exist')
    cy.contains('button', 'Add an employee').click()
    cy.get('[data-testid="add-employee-form"]').should('be.visible')
    cy.get('#employee-first-name').type('Quinn')
    cy.get('#employee-last-name').type('Architect')
    cy.get('#employee-email').type(EMAIL)
    cy.get('#employee-department').select(1)
    cy.get('#employee-job-role').select(JOB_ROLE)
    cy.get('#employee-password').type(PASSWORD)
    cy.contains('button', 'Add employee').click()
    cy.get('[data-testid="modal"]').should('not.exist')
    cy.contains(
      '[data-testid="data-table"] tbody tr',
      'Quinn Architect'
    ).should('contain.text', JOB_ROLE)

    visitDepartments()
    jobRoleCard(JOB_ROLE)
      .find('[data-testid="org-unit-user-count"]')
      .should('have.text', '1')

    jobRoleCard(JOB_ROLE).contains('button', `Delete ${JOB_ROLE}`).click()
    cy.get('[data-testid="modal"]').within(() => {
      cy.contains(
        `1 person is assigned to ${JOB_ROLE}, so it cannot be deleted.`
      ).should('be.visible')
      cy.contains('button', `Delete ${JOB_ROLE}`).should('not.exist')
      cy.contains('button', 'Close').click()
    })

    visitDepartments()
    jobRoleCard(JOB_ROLE).should('exist')
  })

  it('deletes a job role that nobody has been assigned to', () => {
    addJobRole(JOB_ROLE)

    jobRoleCard(JOB_ROLE).contains('button', `Delete ${JOB_ROLE}`).click()
    cy.get('[data-testid="modal"]')
      .contains('button', `Delete ${JOB_ROLE}`)
      .click()

    cy.get('[data-testid="modal"]').should('not.exist')
    jobRoles().contains(JOB_ROLE).should('not.exist')
  })

  it('offers a new job role in the add employee form straight away', () => {
    addJobRole(JOB_ROLE)

    cy.visit('/employees')
    cy.get('[data-testid="table-loading-state"]').should('not.exist')
    cy.contains('button', 'Add an employee').click()
    cy.get('#employee-job-role')
      .find('option')
      .then((options) => {
        expect([...options].map((option) => option.textContent)).to.include(
          JOB_ROLE
        )
      })
  })
})
