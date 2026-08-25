import { DESKTOP, login, USERS } from '../support/e2e'

const SEEDED_USERS = 7

function signIn(email: string): void {
  cy.clearLocalStorage()
  login(email, '/')
  cy.get('[data-testid="app-layout"]').should('exist')
}

function openEmployees(email: string): void {
  signIn(email)
  cy.visit('/employees')
}

describe('the admin employee list', () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    openEmployees(USERS.admin)
    cy.get('[data-testid="screen-employees"]').should('be.visible')
    cy.get('[data-testid="table-loading-state"]').should('not.exist')
  })

  it('lists one row per seeded user', () => {
    cy.get('[data-testid="data-table"] tbody tr').should(
      'have.length',
      SEEDED_USERS
    )
  })

  it('shows the department, job role and line manager by name', () => {
    cy.contains('[data-testid="data-table"] tbody tr', 'David Jones').within(
      () => {
        cy.contains('david.jones@company.com').should('exist')
        cy.contains('Engineering').should('exist')
        cy.contains('Contractor').should('exist')
        cy.contains('Bob Mitchell').should('exist')
        cy.contains('25 days').should('exist')
      }
    )
  })

  it('names an absent line manager rather than leaving the cell blank', () => {
    cy.contains('[data-testid="data-table"] tbody tr', 'Grace Williams')
      .find('[data-testid="employee-manager"]')
      .should('have.text', 'None')
  })

  it('never exposes a password or salt', () => {
    cy.get('[data-testid="screen-employees"]')
      .invoke('text')
      .should((text: string) => {
        expect(text.toLowerCase()).not.to.contain('password')
        expect(text.toLowerCase()).not.to.contain('salt')
      })
  })

  it('offers an edit and a delete action on every row', () => {
    cy.get('[data-testid="data-table"] tbody tr').each((row) => {
      cy.wrap(row)
        .contains('button', /^Edit /)
        .should('exist')
      cy.wrap(row)
        .contains('button', /^Delete /)
        .should('exist')
    })
  })
})

describe('the employee list for a non-Admin', () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
  })

  it('refuses an Employee who types the URL directly', () => {
    openEmployees(USERS.employee)

    cy.get('[data-testid="app-layout"]').should('exist')
    cy.get('[data-testid="screen-employees"]').should('not.exist')
    cy.get('[data-testid="data-table"]').should('not.exist')
    cy.location('pathname').should('eq', '/')
  })

  it('refuses a Manager who types the URL directly', () => {
    openEmployees(USERS.manager)

    cy.get('[data-testid="app-layout"]').should('exist')
    cy.get('[data-testid="screen-employees"]').should('not.exist')
    cy.location('pathname').should('eq', '/')
  })
})
