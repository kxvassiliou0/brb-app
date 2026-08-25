import { DESKTOP, login } from '../support/e2e'

const ENG_MANAGER = 'bob.mitchell@company.com'

const FIN_MANAGER = 'carol.reeves@company.com'

const ENG_REPORTS = ['David Jones', 'Eve Knowles']

const ROWS = '[data-testid="data-table"] tbody tr'

function openQueue(email: string): void {
  login(email, '/')
  cy.get('[data-testid="sidebar"]').should('be.visible')
  cy.visit('/requests')
  cy.contains('h1', 'Team requests').should('be.visible')
}

function queueEmployees(): Cypress.Chainable<string[]> {
  cy.get('[data-testid="table-loading-state"]').should('not.exist')
  return cy.get(ROWS).then((rows) =>
    rows
      .toArray()
      .map((row) => row.querySelector('td button')?.textContent?.trim())
      .filter((name): name is string => Boolean(name))
  )
}

describe("a manager's team leave queue", () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
  })

  it('holds only pending requests from that manager’s direct reports', () => {
    openQueue(ENG_MANAGER)

    queueEmployees().should((names) => {
      expect(names).to.have.length.at.least(1)
      names.forEach((name) => expect(ENG_REPORTS).to.include(name))
    })

    cy.get('[data-testid="data-table"]')
      .should('not.contain.text', 'Bob Mitchell')
      .and('not.contain.text', 'Frank Harrison')
      .and('not.contain.text', 'Grace Williams')

    cy.get(ROWS).each((row) => {
      cy.wrap(row).within(() => {
        cy.contains('Pending').should('exist')
        cy.contains('button', 'Approve').should('exist')
        cy.contains('button', 'Decline').should('exist')
      })
    })
  })

  it("shares no request with a second manager's queue", () => {
    openQueue(ENG_MANAGER)

    queueEmployees().then((engNames) => {
      cy.contains('button', 'Sign out').click()
      openQueue(FIN_MANAGER)

      queueEmployees().should((finNames) => {
        expect(finNames).to.have.length.at.least(1)
        finNames.forEach((name) => expect(engNames).to.not.include(name))
      })
    })
  })
})
