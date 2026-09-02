import {
  apiAddPublicHoliday,
  apiRemovePublicHolidaysByName,
  DESKTOP,
  login,
  USERS,
} from '../support/e2e'

const HOLIDAY = 'Spec Bank Holiday'

const RENAMED = `${HOLIDAY} renamed`

const MONTHS_AHEAD = 4

function isoDate(dayOfMonth: number): string {
  const today = new Date()
  return new Date(
    Date.UTC(today.getFullYear(), today.getMonth() + MONTHS_AHEAD, dayOfMonth)
  )
    .toISOString()
    .slice(0, 10)
}

const HOLIDAY_DATE = isoDate(15)

function browseToMonth(): void {
  for (let step = 0; step < MONTHS_AHEAD; step += 1) {
    cy.get('[data-testid="next-month"]').click()
  }
}

function calendarDay(date: string) {
  return cy.get(`[data-testid="calendar-day"][data-date="${date}"]`)
}

function visitCalendar(): void {
  cy.visit('/team-calendar')
  cy.get('[data-testid="screen-team-calendar"]').should('be.visible')
  browseToMonth()
}

function pickerDay(pickerId: string, date: string): void {
  cy.get(`#${pickerId}`).click()
  for (let step = 0; step < MONTHS_AHEAD; step += 1) {
    cy.get(`[data-testid="${pickerId}-calendar"]`)
      .find('button[aria-label="Next month"]')
      .click()
  }
  cy.get(
    `[data-testid="${pickerId}-calendar"] [data-testid="calendar-day"][data-date="${date}"]`
  ).click()
}

describe('an Admin managing public holidays from the team calendar', () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    apiRemovePublicHolidaysByName([HOLIDAY, RENAMED])
    cy.clearLocalStorage()
  })

  afterEach(() => {
    apiRemovePublicHolidaysByName([HOLIDAY, RENAMED])
  })

  it('adds a bank holiday, which then drops out of an employee day count', () => {
    login(USERS.admin)
    visitCalendar()

    calendarDay(HOLIDAY_DATE).click()
    calendarDay(HOLIDAY_DATE).click()
    cy.get('[data-testid="modal"]').should('be.visible')
    cy.get('#leave-type').select('Public holiday')
    cy.get('#holiday-name').type(HOLIDAY)
    cy.contains('button', 'Add public holiday').click()
    cy.get('[data-testid="modal"]').should('not.exist')

    calendarDay(HOLIDAY_DATE)
      .find('[data-testid="public-holiday"]')
      .should('have.text', HOLIDAY)

    cy.clearLocalStorage()
    login(USERS.employee)
    cy.contains('button', 'Book time off').first().click()
    cy.get('#leave-type').select('Vacation')
    pickerDay('start-date', isoDate(14))
    pickerDay('end-date', isoDate(16))

    cy.get('[data-testid="booking-summary"]').should('contain.text', '2 days')
    cy.get('[data-testid="booking-holidays"]').should('contain.text', HOLIDAY)
  })

  it('renames and then deletes an existing holiday', () => {
    apiAddPublicHoliday(HOLIDAY_DATE, HOLIDAY)
    login(USERS.admin)
    visitCalendar()

    calendarDay(HOLIDAY_DATE).click()
    cy.get('[data-testid="public-holiday-form"]').should('be.visible')
    cy.get('#holiday-name').clear().type(RENAMED)
    cy.contains('button', 'Save changes').click()
    cy.get('[data-testid="modal"]').should('not.exist')

    calendarDay(HOLIDAY_DATE)
      .find('[data-testid="public-holiday"]')
      .should('have.text', RENAMED)

    calendarDay(HOLIDAY_DATE).click()
    cy.contains('button', `Delete ${RENAMED}`).click()
    cy.get('[data-testid="modal"]')
      .contains('button', `Delete ${RENAMED}`)
      .click()
    cy.get('[data-testid="modal"]').should('not.exist')

    calendarDay(HOLIDAY_DATE)
      .find('[data-testid="public-holiday"]')
      .should('not.exist')
  })
})
