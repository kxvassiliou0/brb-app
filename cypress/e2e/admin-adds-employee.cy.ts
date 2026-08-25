import { apiRemoveUsersByEmail, DESKTOP, login, USERS } from '../support/e2e'

const EMAIL = 'nina.newstarter@company.com'
const NAME = 'Nina Newstarter'
const PASSWORD = 'Password123!'

function row(name: string) {
  return cy.contains('[data-testid="data-table"] tbody tr', name)
}

function nextTuesday(monthsAhead: number): string {
  const today = new Date()
  const date = new Date(
    Date.UTC(today.getFullYear(), today.getMonth() + monthsAhead, 10)
  )
  while (date.getUTCDay() !== 2) date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function pickDate(pickerId: string, iso: string, monthsAhead: number): void {
  cy.get(`#${pickerId}`).click()
  for (let step = 0; step < monthsAhead; step += 1) {
    cy.get(`[data-testid="${pickerId}-calendar"]`)
      .find('button[aria-label="Next month"]')
      .click()
  }
  cy.get(
    `[data-testid="${pickerId}-calendar"] [data-testid="calendar-day"][data-date="${iso}"]`
  ).click()
}

function openAddForm(): void {
  cy.contains('button', 'Add an employee').click()
  cy.get('[data-testid="add-employee-form"]').should('be.visible')
}

function fillNewStarter(): void {
  cy.get('#employee-first-name').type('Nina')
  cy.get('#employee-last-name').type('Newstarter')
  cy.get('#employee-email').type(EMAIL)
  cy.get('#employee-department').select(1)
  cy.get('#employee-job-role').select(1)
  cy.get('#employee-password').type(PASSWORD)
}

describe('an Admin adding a new employee', () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    apiRemoveUsersByEmail([EMAIL])

    cy.clearLocalStorage()
    login(USERS.admin, '/')
    cy.visit('/employees')
    cy.get('[data-testid="table-loading-state"]').should('not.exist')
  })

  afterEach(() => {
    apiRemoveUsersByEmail([EMAIL])
  })

  it('offers the three roles and the seeded departments and job roles', () => {
    openAddForm()

    cy.get('#employee-role')
      .find('option')
      .then((options) => {
        expect([...options].map((option) => option.textContent)).to.deep.equal([
          'Employee',
          'Manager',
          'Admin',
        ])
      })
    cy.get('#employee-department')
      .find('option')
      .should('have.length.greaterThan', 1)
    cy.get('#employee-job-role')
      .find('option')
      .should('have.length.greaterThan', 1)
    cy.get('#employee-allowance').should('have.value', '25')
  })

  it('refuses a password below ten characters without leaving the form', () => {
    openAddForm()
    cy.get('#employee-first-name').type('Nina')
    cy.get('#employee-last-name').type('Newstarter')
    cy.get('#employee-email').type(EMAIL)
    cy.get('#employee-department').select(1)
    cy.get('#employee-job-role').select(1)
    cy.get('#employee-password').type('short')
    cy.contains('button', 'Add employee').click()

    cy.contains('Password must be at least 10 characters long').should(
      'be.visible'
    )
    cy.get('[data-testid="add-employee-form"]').should('be.visible')
  })

  it('refuses an email that already belongs to somebody else', () => {
    openAddForm()
    cy.get('#employee-first-name').type('Nina')
    cy.get('#employee-last-name').type('Newstarter')
    cy.get('#employee-email').type(USERS.employee)
    cy.get('#employee-department').select(1)
    cy.get('#employee-job-role').select(1)
    cy.get('#employee-password').type(PASSWORD)
    cy.contains('button', 'Add employee').click()

    cy.contains('already belongs to someone else').should('be.visible')
    cy.get('[data-testid="add-employee-form"]').should('be.visible')
  })

  it('creates a new starter who can then sign in and book leave', () => {
    openAddForm()
    fillNewStarter()
    cy.contains('button', 'Add employee').click()

    cy.get('[data-testid="modal"]').should('not.exist')
    row(NAME).within(() => {
      cy.contains(EMAIL).should('exist')
      cy.contains('25 days').should('exist')
    })

    cy.clearLocalStorage()
    login(EMAIL, '/')
    cy.get('[data-testid="screen-employee-dashboard"]').should('be.visible')

    const monthsAhead = 5
    const day = nextTuesday(monthsAhead)

    cy.contains('button', 'Book time off').first().click()
    cy.get('[data-testid="modal"]').should('be.visible')
    cy.get('#leave-type').select('Vacation')
    pickDate('start-date', day, monthsAhead)
    pickDate('end-date', day, monthsAhead)
    cy.get('[data-testid="booking-summary"]').should('contain.text', '1 day')
    cy.get('#reason').type('Booked by the add employee spec')
    cy.contains('button', 'Send request').click()

    cy.get('[data-testid="modal"]').should('not.exist')
    cy.url().should('include', '/requests')
    cy.get('[data-testid="booking-confirmation"]').should(
      'contain.text',
      'submitted for review'
    )
    cy.get('[data-testid="data-table"] tbody tr[data-highlighted="true"]')
      .should('have.length', 1)
      .within(() => {
        cy.contains('Vacation').should('exist')
        cy.contains('Pending').should('exist')
      })
  })
})
