import { assertNoHorizontalScroll, login, USERS } from '../support/e2e'

const DESKTOP = { width: 1280, height: 900 }

const MOBILE = { width: 320, height: 720 }

const WCAG_258_MINIMUM_PX = 24

function isoDate(monthsAhead: number, dayOfMonth: number): string {
  const today = new Date()
  const target = new Date(
    Date.UTC(today.getFullYear(), today.getMonth() + monthsAhead, dayOfMonth)
  )
  return target.toISOString().slice(0, 10)
}

function day(iso: string) {
  return cy.get(`[data-testid="calendar-day"][data-date="${iso}"]`)
}

describe('the team calendar', () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    login(USERS.manager, '/')
    cy.visit('/team-calendar')
    cy.get('[data-testid="calendar-month"]').should('be.visible')
  })

  it('completes a date range selection by clicking alone, with no dragging', () => {
    const start = isoDate(0, 10)
    const end = isoDate(0, 14)

    cy.get('[data-testid="selection-status"]').should(
      'contain.text',
      'Select a start date'
    )

    day(start).click()
    day(start).should('have.attr', 'aria-pressed', 'true')
    cy.get('[data-testid="selection-status"]').should(
      'contain.text',
      'Choose an end date'
    )

    day(end).click()

    cy.get('[data-testid="modal"]').should('be.visible')
    cy.get('#start-date').should('not.have.text', 'Select start date')
    cy.get('#end-date').should('not.have.text', 'Select end date')
    cy.get('[data-testid="booking-summary"]').should('contain.text', '5 days')
  })

  it('abandons a started selection without booking anything', () => {
    day(isoDate(0, 10)).click()
    cy.contains('button', 'Clear selection').click()

    cy.get('[data-testid="modal"]').should('not.exist')
    day(isoDate(0, 10)).should('have.attr', 'aria-pressed', 'false')
  })

  it('moves the month forward and backward', () => {
    cy.get('[data-testid="calendar-month"]')
      .invoke('text')
      .then((thisMonth) => {
        cy.get('[data-testid="next-month"]').click()
        cy.get('[data-testid="calendar-month"]').should(
          'not.have.text',
          thisMonth
        )
        cy.get('[data-testid="previous-month"]').click()
        cy.get('[data-testid="calendar-month"]').should('have.text', thisMonth)
      })
  })

  it('shows seven columns, Monday to Sunday', () => {
    cy.get('[data-testid="weekday-heading"]').should(($headings) => {
      expect([...$headings].map((el) => el.textContent?.trim())).to.deep.equal([
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat',
        'Sun',
      ])
    })
  })

  it('keeps every cell and control at or above the 24px minimum', () => {
    cy.get(
      '[data-testid="screen-team-calendar"] button, [data-testid="screen-team-calendar"] a'
    ).should(($controls) => {
      const undersized = [...$controls]
        .map((el) => el.getBoundingClientRect())
        .filter(
          (rect) =>
            rect.width < WCAG_258_MINIMUM_PX ||
            rect.height < WCAG_258_MINIMUM_PX
        )
      expect(
        undersized,
        'controls smaller than 24 by 24 pixels'
      ).to.have.length(0)
    })
  })

  it('reflows to 320px without scrolling the page sideways', () => {
    cy.viewport(MOBILE.width, MOBILE.height)
    cy.get('[data-testid="calendar-month"]').should('be.visible')
    assertNoHorizontalScroll()
  })
})
