import {
  apiRemoveDepartmentsByName,
  apiRemoveUsersByEmail,
  DESKTOP,
  login,
  USERS,
} from '../support/e2e'

const DEPARTMENT = 'Field Operations'
const EMAIL = 'nina.field@company.com'
const PASSWORD = 'Password123!'

function departments() {
  return cy.get('[data-testid="department-section"]')
}

function departmentCard(name: string) {
  return departments().contains('[data-testid="org-unit-card"]', name)
}

function addDepartment(name: string): void {
  departments().contains('button', 'Add a department').click()
  cy.get('[data-testid="department-form"]').should('be.visible')
  cy.get('#department-name').type(name)
  cy.get('[data-testid="modal"]').contains('button', 'Add a department').click()
  cy.get('[data-testid="modal"]').should('not.exist')
}

function visitDepartments(): void {
  cy.visit('/departments')
  cy.get('[data-testid="screen-departments"]').should('be.visible')
  departments().find('[data-testid="org-unit-card"]').should('exist')
}

describe('an Admin managing departments', () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    apiRemoveUsersByEmail([EMAIL])
    apiRemoveDepartmentsByName([DEPARTMENT])

    cy.clearLocalStorage()
    login(USERS.admin)
    visitDepartments()
  })

  afterEach(() => {
    apiRemoveUsersByEmail([EMAIL])
    apiRemoveDepartmentsByName([DEPARTMENT])
  })

  it('refuses to delete a department once somebody has been put in it', () => {
    addDepartment(DEPARTMENT)

    departmentCard(DEPARTMENT)
      .find('[data-testid="org-unit-user-count"]')
      .should('have.text', '0')

    cy.visit('/employees')
    cy.get('[data-testid="table-loading-state"]').should('not.exist')
    cy.contains('button', 'Add an employee').click()
    cy.get('[data-testid="add-employee-form"]').should('be.visible')
    cy.get('#employee-first-name').type('Nina')
    cy.get('#employee-last-name').type('Field')
    cy.get('#employee-email').type(EMAIL)
    cy.get('#employee-department').select(DEPARTMENT)
    cy.get('#employee-job-role').select(1)
    cy.get('#employee-password').type(PASSWORD)
    cy.contains('button', 'Add employee').click()
    cy.get('[data-testid="modal"]').should('not.exist')
    cy.contains('[data-testid="data-table"] tbody tr', 'Nina Field').should(
      'contain.text',
      DEPARTMENT
    )

    visitDepartments()
    departmentCard(DEPARTMENT)
      .find('[data-testid="org-unit-user-count"]')
      .should('have.text', '1')

    departmentCard(DEPARTMENT)
      .contains('button', `Delete ${DEPARTMENT}`)
      .click()
    cy.get('[data-testid="modal"]').within(() => {
      cy.contains(
        `1 person is in ${DEPARTMENT}, so it cannot be deleted.`
      ).should('be.visible')
      cy.contains('button', `Delete ${DEPARTMENT}`).should('not.exist')
      cy.contains('button', 'Close').click()
    })

    visitDepartments()
    departmentCard(DEPARTMENT).should('exist')
  })
})
