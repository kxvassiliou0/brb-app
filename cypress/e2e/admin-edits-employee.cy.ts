import {
  apiCreateUser,
  apiFirstIds,
  apiRemoveUsersByEmail,
  DESKTOP,
  login,
  USERS,
} from '../support/e2e'

const EMAIL = 'tess.editable@company.com'
const NEW_EMAIL = 'tess.renamed@company.com'
const NAME = 'Tess Editable'
const NEW_NAME = 'Tessa Renamed'

function row(name: string) {
  return cy.contains('[data-testid="data-table"] tbody tr', name)
}

describe('an Admin editing an employee record', () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    apiRemoveUsersByEmail([EMAIL, NEW_EMAIL])
    apiFirstIds().then(({ departmentId, jobRoleId }) => {
      apiCreateUser({
        firstName: 'Tess',
        lastName: 'Editable',
        email: EMAIL,
        role: 'Employee',
        annualLeaveAllowance: 21,
        departmentId,
        jobRoleId,
      })
    })

    cy.clearLocalStorage()
    login(USERS.admin, '/')
    cy.visit('/employees')
    cy.get('[data-testid="table-loading-state"]').should('not.exist')
  })

  afterEach(() => {
    apiRemoveUsersByEmail([EMAIL, NEW_EMAIL])
  })

  it('opens the form pre-populated from the stored record', () => {
    row(NAME).contains('button', `Edit ${NAME}`).click()

    cy.get('[data-testid="edit-employee-form"]').should('be.visible')
    cy.get('#employee-first-name').should('have.value', 'Tess')
    cy.get('#employee-last-name').should('have.value', 'Editable')
    cy.get('#employee-email').should('have.value', EMAIL)
    cy.get('#employee-allowance').should('have.value', '21')
    cy.get('#employee-password').should('have.value', '')
  })

  it('shows the saved change in the list without reloading the page', () => {
    cy.window().then((win) => {
      win.document.body.setAttribute('data-never-reloaded', 'true')
    })

    row(NAME).contains('button', `Edit ${NAME}`).click()
    cy.get('#employee-first-name').clear().type('Tessa')
    cy.get('#employee-last-name').clear().type('Renamed')
    cy.get('#employee-email').clear().type(NEW_EMAIL)
    cy.get('#employee-allowance').clear().type('27')
    cy.contains('button', 'Save changes').click()

    cy.get('[data-testid="modal"]').should('not.exist')
    row(NEW_NAME).within(() => {
      cy.contains(NEW_EMAIL).should('exist')
      cy.contains('27 days').should('exist')
    })
    cy.contains('[data-testid="data-table"]', NAME).should('not.exist')
    cy.get('body').should('have.attr', 'data-never-reloaded', 'true')
  })

  it('keeps the current password when the password field is left blank', () => {
    row(NAME).contains('button', `Edit ${NAME}`).click()
    cy.get('#employee-allowance').clear().type('23')
    cy.contains('button', 'Save changes').click()

    cy.get('[data-testid="modal"]').should('not.exist')
    row(NAME).contains('23 days').should('exist')

    cy.clearLocalStorage()
    login(EMAIL, '/')
    cy.get('[data-testid="app-layout"]').should('exist')
  })

  it('refuses a new password below ten characters without saving', () => {
    row(NAME).contains('button', `Edit ${NAME}`).click()
    cy.get('#employee-password').type('short')
    cy.contains('button', 'Save changes').click()

    cy.contains('Password must be at least 10 characters long').should(
      'be.visible'
    )
    cy.get('[data-testid="edit-employee-form"]').should('be.visible')
  })
})
