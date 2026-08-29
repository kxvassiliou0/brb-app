import { authHeaders, DESKTOP, login, NARROW, USERS } from '../support/e2e'

const API_URL = Cypress.env('apiUrl') ?? 'http://localhost:3000'

const PROFILE_FIELDS = [
  '#profile-name',
  '#profile-email',
  '#profile-role',
  '#profile-department',
  '#profile-job-role',
  '#profile-allowance',
]

interface Profile {
  firstName: string
  lastName: string
  email: string
  role: string
  annualLeaveAllowance: number
  department: { name: string }
  jobRole: { name: string }
}

interface Balance {
  annual_allowance: number
  days_used: number
  days_remaining: number
}

function ownProfile(): Cypress.Chainable<Profile> {
  return authHeaders(USERS.employee).then((headers) =>
    cy
      .request({ url: `${API_URL}/api/users/me`, headers })
      .then((res) => res.body.data as Profile)
  )
}

function ownBalance(): Cypress.Chainable<Balance> {
  return authHeaders(USERS.employee).then((headers) =>
    cy
      .request({ url: `${API_URL}/api/users/me`, headers })
      .then((me) =>
        cy.request({
          url: `${API_URL}/api/leave-requests/remaining/${me.body.data.id}`,
          headers,
        })
      )
      .then((res) => res.body.data as Balance)
  )
}

function openSettings(): void {
  login(USERS.employee, '/')
  cy.get('[data-testid="screen-employee-dashboard"]').should('be.visible')
  cy.visit('/settings')
  cy.contains('h1', 'Settings').should('be.visible')
  cy.get('[data-testid="loading-state"]').should('not.exist')
}

describe('my settings', () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
  })

  it('reads back every profile detail the endpoint holds', () => {
    openSettings()

    ownProfile().then((me) => {
      cy.get('#profile-name').should(
        'have.value',
        `${me.firstName} ${me.lastName}`
      )
      cy.get('#profile-email').should('have.value', me.email)
      cy.get('#profile-role').should('have.value', me.role)
      cy.get('#profile-department').should('have.value', me.department.name)
      cy.get('#profile-job-role').should('have.value', me.jobRole.name)
      cy.get('#profile-allowance').should(
        'have.value',
        `${me.annualLeaveAllowance} days`
      )
      cy.get('[data-testid="profile-display-name"]').should(
        'contain.text',
        `${me.firstName} ${me.lastName}`
      )
    })
  })

  it('holds every profile field read-only and refuses the caret', () => {
    openSettings()

    PROFILE_FIELDS.forEach((selector) => {
      cy.get(selector).should('have.attr', 'readonly')
      cy.get(selector).should('have.attr', 'aria-readonly', 'true')
      cy.get(selector).should('have.css', 'cursor', 'not-allowed')
    })

    cy.get('#profile-name').click()
    cy.get('#profile-name').should('not.be.focused')

    cy.get('#profile-name').then(($field) => {
      const original = $field.val()
      cy.get('#profile-name')
        .type('Someone Else', { force: true })
        .should('have.value', original)
    })
  })

  it('offers nothing that could save a change to the profile', () => {
    openSettings()

    cy.get('[data-testid="profile-section"] button').should('not.exist')
    cy.contains('button', 'Save changes').should('not.exist')
    cy.get('[data-testid="profile-section"]').should(
      'contain.text',
      'held by your administrator'
    )
  })

  it('shows the leave allowance the balance endpoint reports', () => {
    openSettings()

    ownBalance().then((balance) => {
      cy.get('[data-testid="leave-allowance-section"]').within(() => {
        cy.contains('[data-testid="stat-card"]', 'Annual allowance').should(
          'contain.text',
          `${balance.annual_allowance} days`
        )
        cy.contains('[data-testid="stat-card"]', 'Taken so far').should(
          'contain.text',
          `${balance.days_used} days`
        )
        cy.contains('[data-testid="stat-card"]', 'Remaining').should(
          'contain.text',
          `${balance.days_remaining} days`
        )
      })
    })
  })

  it('stacks the fields rather than scrolling sideways on a phone', () => {
    cy.viewport(NARROW.width, NARROW.height)
    openSettings()

    cy.get('#profile-name').should('be.visible')
    cy.get('[data-testid="leave-allowance-section"]').should('be.visible')
    cy.document().then((doc) => {
      expect(doc.body.scrollWidth).to.be.at.most(
        doc.documentElement.clientWidth
      )
    })
  })
})
