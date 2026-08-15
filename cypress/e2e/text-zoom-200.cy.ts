import {
  assertNoHorizontalScroll,
  describeElement,
  login,
  USERS,
} from '../support/e2e'

const DESKTOP = { width: 1280, height: 800 }

const ZOOMED_VIEWPORT = { width: DESKTOP.width / 2, height: DESKTOP.height / 2 }

const CLIP_TOLERANCE_PX = 1

const CLIPPING_OVERFLOW = ['hidden', 'clip']

function resizeTextTo200Percent() {
  cy.document().then((doc) => {
    doc.documentElement.style.fontSize = '200%'
  })
}

function assertNothingClipped() {
  cy.document().then((doc) => {
    const view = doc.defaultView!
    const clipped = Array.from(doc.querySelectorAll('body *'))
      .filter((el) => {
        const style = view.getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden')
          return false
        if (style.textOverflow === 'ellipsis') return false
        if (el.clientWidth <= 1 || el.clientHeight <= 1) return false

        const clipsX = CLIPPING_OVERFLOW.includes(style.overflowX)
        const clipsY = CLIPPING_OVERFLOW.includes(style.overflowY)
        return (
          (clipsX && el.scrollWidth > el.clientWidth + CLIP_TOLERANCE_PX) ||
          (clipsY && el.scrollHeight > el.clientHeight + CLIP_TOLERANCE_PX)
        )
      })
      .slice(0, 5)
      .map(
        (el) =>
          `${describeElement(el)} content ${el.scrollWidth}x${el.scrollHeight} cut to ${el.clientWidth}x${el.clientHeight}`
      )

    expect(clipped, 'content cut off with no way to reach it').to.deep.equal([])
  })
}

function assertScreenHoldsAtDoubledText(path: string, testId: string) {
  cy.visit(path)
  resizeTextTo200Percent()
  cy.get(`[data-testid="${testId}"]`).should('be.visible')
  assertNoHorizontalScroll()
  assertNothingClipped()
}

describe('200% text resize (WCAG 1.4.4)', () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
  })

  it('holds the sign-in screen without clipping', () => {
    cy.visit('/login')
    resizeTextTo200Percent()
    cy.get('[data-testid="screen-login"]').should('be.visible')
    cy.get('#email').should('be.visible')
    cy.get('#password').should('be.visible')
    cy.contains('button', 'Sign in').should('be.visible')
    assertNoHorizontalScroll()
    assertNothingClipped()
  })

  it('leaves navigation clickable rather than covered by other content', () => {
    login(USERS.manager, '/manager')
    resizeTextTo200Percent()
    cy.get('[data-testid="sidebar"]').contains('a', 'Requests').click()
    cy.url().should('include', '/manager/requests')
    cy.get('[data-testid="screen-requests"]').should('be.visible')
    assertNoHorizontalScroll()
  })

  it('keeps form controls reachable and usable', () => {
    login(USERS.employee, '/employee')
    resizeTextTo200Percent()
    cy.contains('button', 'Book time off').first().click()
    cy.get('#leave-type').should('be.visible').select('Sick')
    cy.get('#start-date').should('be.visible').click()
    cy.get(
      '[data-testid="start-date-calendar"] [data-testid="calendar-day"]:not([disabled])'
    )
      .first()
      .click()
    cy.get('#reason').should('be.visible').type('Recovering')
    cy.contains('button', 'Send request').should('be.visible')
    assertNoHorizontalScroll()
    assertNothingClipped()
  })

  it('holds every Employee screen', () => {
    login(USERS.employee, '/employee')
    assertScreenHoldsAtDoubledText('/employee', 'screen-employee-dashboard')
    assertScreenHoldsAtDoubledText(
      '/employee/my-requests',
      'screen-my-requests'
    )
    assertScreenHoldsAtDoubledText('/employee/settings', 'screen-settings')
  })

  it('holds every Manager screen', () => {
    login(USERS.manager, '/manager')
    assertScreenHoldsAtDoubledText('/manager', 'screen-manager-dashboard')
    assertScreenHoldsAtDoubledText('/manager/requests', 'screen-requests')
    assertScreenHoldsAtDoubledText(
      '/manager/team-calendar',
      'screen-team-calendar'
    )
    assertScreenHoldsAtDoubledText('/manager/settings', 'screen-settings')
  })

  it('holds every Admin screen', () => {
    login(USERS.admin, '/admin')
    assertScreenHoldsAtDoubledText('/admin', 'screen-admin-dashboard')
    assertScreenHoldsAtDoubledText('/admin/requests', 'screen-requests')
    assertScreenHoldsAtDoubledText('/admin/employees', 'screen-employees')
    assertScreenHoldsAtDoubledText('/admin/departments', 'screen-departments')
    assertScreenHoldsAtDoubledText('/admin/settings', 'screen-settings')
  })
})

describe('200% page zoom (WCAG 1.4.10)', () => {
  beforeEach(() => {
    cy.viewport(ZOOMED_VIEWPORT.width, ZOOMED_VIEWPORT.height)
  })

  it('collapses the sidebar to a bottom bar as the viewport halves', () => {
    login(USERS.employee, '/employee')
    cy.get('[data-testid="bottom-nav"]').should('be.visible')
    cy.get('[data-testid="sidebar"]').should('not.exist')
    assertNoHorizontalScroll()
  })

  it('stacks tables into cards and keeps navigation reachable', () => {
    login(USERS.manager, '/manager')
    cy.visit('/manager/requests')
    cy.get('[data-testid="data-table"]').should('not.exist')
    cy.get('[data-testid="data-cards"]').should('exist')
    cy.get('[data-testid="bottom-nav"]').contains('a', 'Calendar').click()
    cy.url().should('include', '/manager/team-calendar')
    assertNoHorizontalScroll()
    assertNothingClipped()
  })
})
