const FOCUS_RING = 'rgb(62, 81, 54)'
const BORDER_INTERACTIVE = 'rgb(107, 101, 87)'

describe('focus ring', () => {
  beforeEach(() => {
    cy.visit('/login')
  })

  it('bounds inputs with the interactive border token', () => {
    cy.get('#email').should('have.css', 'border-color', BORDER_INTERACTIVE)
    cy.get('#password').should('have.css', 'border-color', BORDER_INTERACTIVE)
  })

  it('shows a 3px focus ring with 2px offset on a focused input', () => {
    cy.get('#email').focus()
    cy.focused().should('have.attr', 'id', 'email')
    cy.get('#email')
      .should('have.css', 'outline-style', 'solid')
      .and('have.css', 'outline-width', '3px')
      .and('have.css', 'outline-color', FOCUS_RING)
      .and('have.css', 'outline-offset', '2px')
  })

  it('moves the ring with keyboard focus and leaves no ring behind', () => {
    cy.get('#email').focus()
    cy.get('#password').focus()
    cy.get('#password').should('have.css', 'outline-width', '3px')
    cy.get('#email').should('not.have.css', 'outline-width', '3px')
  })
})
