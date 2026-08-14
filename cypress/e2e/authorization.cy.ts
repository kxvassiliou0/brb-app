describe('role-based route authorization', () => {
  beforeEach(() => {
    cy.visit('/login')
    cy.get('#email').type('david.jones@company.com')
    cy.get('#password').type('Password123!')
    cy.contains('button', 'Sign in').click()
    cy.url().should('include', '/employee')
  })

  it('refuses direct URL entry into a Manager route', () => {
    cy.visit('/manager/team-calendar')
    cy.url().should('include', '/employee')
    cy.url().should('not.include', '/manager')
    cy.get('[data-testid="screen-team-calendar"]').should('not.exist')
  })

  it('refuses direct URL entry into an Admin route', () => {
    cy.visit('/admin/employees')
    cy.url().should('include', '/employee')
    cy.url().should('not.include', '/admin')
    cy.get('[data-testid="screen-employees"]').should('not.exist')
  })

  it('only shows Employee nav items regardless of the URL typed', () => {
    cy.visit('/manager/team-calendar')
    cy.get('[data-testid="sidebar"]')
      .contains('a', 'My requests')
      .should('be.visible')
    cy.get('[data-testid="sidebar"]')
      .contains('a', 'Team calendar')
      .should('not.exist')
  })
})
