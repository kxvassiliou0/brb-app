import {
  assertNoHorizontalScroll,
  describeElement,
  login,
  USERS,
} from '../support/e2e'

const NARROW = { width: 320, height: 568 }

const WCAG_258_MINIMUM_PX = 24

const INTERACTIVE = 'a, button, input, select, textarea, [role="button"]'

function assertTargetsMeetMinimum() {
  cy.document().then((doc) => {
    const undersized = Array.from(doc.querySelectorAll(INTERACTIVE))
      .filter((el) => {
        const rect = el.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      })
      .filter((el) => {
        const rect = el.getBoundingClientRect()
        return (
          rect.width < WCAG_258_MINIMUM_PX || rect.height < WCAG_258_MINIMUM_PX
        )
      })
      .map((el) => {
        const rect = el.getBoundingClientRect()
        return `${describeElement(el)} ${Math.round(rect.width)}x${Math.round(rect.height)}`
      })

    expect(undersized, 'targets under 24x24').to.deep.equal([])
  })
}

function assertScreenReflows(path: string, testId: string) {
  cy.visit(path)
  cy.get(`[data-testid="${testId}"]`).should('be.visible')
  assertNoHorizontalScroll()
  assertTargetsMeetMinimum()
}

describe('reflow at 320px (WCAG 1.4.10)', () => {
  beforeEach(() => {
    cy.viewport(NARROW.width, NARROW.height)
  })

  it('reflows the sign-in screen', () => {
    cy.visit('/login')
    cy.get('[data-testid="screen-login"]').should('be.visible')
    assertNoHorizontalScroll()
    assertTargetsMeetMinimum()
  })

  it('collapses navigation to a bottom bar rather than a sidebar', () => {
    login(USERS.employee, '/')
    cy.get('[data-testid="bottom-nav"]').should('be.visible')
    cy.get('[data-testid="sidebar"]').should('not.exist')
    assertNoHorizontalScroll()
  })

  it('stacks data tables into cards instead of scrolling sideways', () => {
    login(USERS.manager, '/')
    cy.visit('/requests')
    cy.get('[data-testid="screen-requests"]').should('be.visible')
    cy.get('[data-testid="data-table"]').should('not.exist')
    cy.get('[data-testid="data-cards"]').should('exist')
    assertNoHorizontalScroll()
  })

  it('reflows every Employee screen', () => {
    login(USERS.employee, '/')
    assertScreenReflows('/', 'screen-employee-dashboard')
    assertScreenReflows('/requests', 'screen-requests')
    assertScreenReflows('/settings', 'screen-settings')
  })

  it('reflows the book time off dialog and its date picker', () => {
    login(USERS.employee, '/')
    cy.contains('button', 'Book time off').first().click()
    cy.get('[data-testid="modal"]').should('be.visible')
    assertNoHorizontalScroll()
    assertTargetsMeetMinimum()

    cy.get('#start-date').click()
    cy.get('[data-testid="start-date-calendar"]').should('be.visible')
    assertNoHorizontalScroll()
    assertTargetsMeetMinimum()
  })

  it('reflows every Manager screen', () => {
    login(USERS.manager, '/')
    assertScreenReflows('/', 'screen-manager-dashboard')
    assertScreenReflows('/requests', 'screen-requests')
    assertScreenReflows('/requests/1', 'screen-request-review')
    assertScreenReflows('/team-calendar', 'screen-team-calendar')
    assertScreenReflows('/settings', 'screen-settings')
  })

  it('reflows every Admin screen', () => {
    login(USERS.admin, '/')
    assertScreenReflows('/', 'screen-admin-dashboard')
    assertScreenReflows('/requests', 'screen-requests')
    assertScreenReflows('/employees', 'screen-employees')
    assertScreenReflows('/departments', 'screen-departments')
    assertScreenReflows('/settings', 'screen-settings')
  })

  it('reflows the not-found screen', () => {
    login(USERS.employee, '/')
    cy.visit('/nowhere', { failOnStatusCode: false })
    cy.get('[data-testid="not-found"]').should('be.visible')
    assertNoHorizontalScroll()
    assertTargetsMeetMinimum()
  })
})
