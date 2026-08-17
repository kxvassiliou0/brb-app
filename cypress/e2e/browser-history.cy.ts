describe('browser history and deep links', () => {
  it('supports back/forward navigation and refreshing a deep link', () => {
    cy.visit('/login')
    cy.get('#email').type('bob.mitchell@company.com')
    cy.get('#password').type('Password123!')
    cy.contains('button', 'Sign in').click()
    cy.url().should('include', '/manager')

    cy.get('[data-testid="sidebar"]').contains('a', 'Requests').click()
    cy.url().should('include', '/requests')
    cy.get('[data-testid="sidebar"]').contains('a', 'Team calendar').click()
    cy.url().should('include', '/team-calendar')

    cy.go('back')
    cy.url().should('include', '/requests')
    cy.go('back')
    cy.url().should('match', /\/manager$/)
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
