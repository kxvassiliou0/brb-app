import { login, USERS } from '../support/e2e'

describe('browser history and deep links', () => {
  it('supports back/forward navigation and refreshing a deep link', () => {
    login(USERS.manager, '/')
    cy.location('pathname').should('equal', '/')

    cy.get('[data-testid="sidebar"]').contains('a', 'Requests').click()
    cy.url().should('include', '/requests')
    cy.get('[data-testid="sidebar"]').contains('a', 'Team calendar').click()
    cy.url().should('include', '/team-calendar')

    cy.go('back')
    cy.url().should('include', '/requests')
    cy.go('back')
    cy.location('pathname').should('equal', '/')
    cy.go('forward')
    cy.url().should('include', '/requests')

    cy.visit('/team-calendar')
    cy.get('[data-testid="screen-team-calendar"]').should('be.visible')
    cy.reload()
    cy.get('[data-testid="screen-team-calendar"]').should('be.visible')

    cy.visit('/nope', { failOnStatusCode: false })
    cy.get('[data-testid="not-found"]').should('be.visible')
  })
})
