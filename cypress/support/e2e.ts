export const USERS = {
  admin: 'alice.thompson@company.com',
  manager: 'bob.mitchell@company.com',
  managersManager: 'carol.reeves@company.com',
  employee: 'david.jones@company.com',
} as const

export const DESKTOP = { width: 1280, height: 900 } as const

export const NARROW = { width: 320, height: 568 } as const

export const WCAG_258_MINIMUM_PX = 24

export const API_URL = Cypress.env('apiUrl') ?? 'http://localhost:3000'

export const PASSWORD = 'Password123!'

export function login(email: string, landsOn = '/'): void {
  cy.visit('/login')
  cy.get('#email').type(email)
  cy.get('#password').type(PASSWORD)
  cy.contains('button', 'Sign in').click()

  cy.get('[data-testid="app-layout"]').should('exist')
  cy.url().should('not.include', '/login')
  if (landsOn !== '/') cy.url().should('include', landsOn)
}

export function tokenFor(email: string): Cypress.Chainable<string> {
  return cy
    .request('POST', `${API_URL}/api/login`, { email, password: PASSWORD })
    .then((res) => String(res.body))
}

export function authHeaders(
  email: string
): Cypress.Chainable<{ Authorization: string }> {
  return tokenFor(email).then((token) => ({
    Authorization: `Bearer ${token}`,
  }))
}

export interface ApiUser {
  id: number
  email: string
}

export interface NewUser {
  firstName: string
  lastName: string
  email: string
  role: 'Admin' | 'Manager' | 'Employee'
  annualLeaveAllowance: number
  departmentId: number
  jobRoleId: number
  managerId?: number | null
}

function adminToken(): Cypress.Chainable<string> {
  return tokenFor(USERS.admin)
}

function asAdmin<T>(
  request: (headers: Record<string, string>) => Cypress.Chainable<T>
): Cypress.Chainable<T> {
  return adminToken().then((token) =>
    request({ Authorization: `Bearer ${token}` })
  )
}

export function apiCreateUser(user: NewUser): Cypress.Chainable<number> {
  return asAdmin((headers) =>
    cy
      .request({
        method: 'POST',
        url: `${API_URL}/api/users`,
        headers,
        body: { managerId: null, ...user, password: PASSWORD },
      })
      .then((response) => response.body.data.id as number)
  )
}

export function apiDeleteUser(id: number): void {
  asAdmin((headers) =>
    cy.request({
      method: 'DELETE',
      url: `${API_URL}/api/users/${id}`,
      headers,
      failOnStatusCode: false,
    })
  )
}

export function apiRemoveUsersByEmail(emails: string[]): void {
  asAdmin((headers) =>
    cy
      .request({ method: 'GET', url: `${API_URL}/api/users`, headers })
      .then((response) => {
        const users = (response.body.data ?? []) as ApiUser[]
        users
          .filter((user) => emails.includes(user.email))
          .forEach((user) => apiDeleteUser(user.id))
      })
  )
}

export interface ApiJobRole {
  id: number
  name: string
  userCount: number
}

export function apiJobRoles(): Cypress.Chainable<ApiJobRole[]> {
  return asAdmin((headers) =>
    cy
      .request({ method: 'GET', url: `${API_URL}/api/job-roles`, headers })
      .then((response) => (response.body.data ?? []) as ApiJobRole[])
  )
}

export function apiRemoveJobRolesByName(names: string[]): void {
  apiJobRoles().then((jobRoles) => {
    jobRoles
      .filter((jobRole) => names.includes(jobRole.name))
      .forEach((jobRole) => {
        asAdmin((headers) =>
          cy.request({
            method: 'DELETE',
            url: `${API_URL}/api/job-roles/${jobRole.id}`,
            headers,
            failOnStatusCode: false,
          })
        )
      })
  })
}

export function apiFirstIds(): Cypress.Chainable<{
  departmentId: number
  jobRoleId: number
}> {
  return asAdmin((headers) =>
    cy
      .request({ method: 'GET', url: `${API_URL}/api/departments`, headers })
      .then((departments) =>
        cy
          .request({ method: 'GET', url: `${API_URL}/api/job-roles`, headers })
          .then((jobRoles) => ({
            departmentId: departments.body.data[0].id as number,
            jobRoleId: jobRoles.body.data[0].id as number,
          }))
      )
  )
}

export function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ''
  const testId = el.getAttribute('data-testid')
  const text = el.textContent?.trim().slice(0, 24) ?? ''
  return `${tag}${id}${testId ? `[${testId}]` : ''}${text ? ` "${text}"` : ''}`
}

function hasScrollingAncestor(el: Element, doc: Document): boolean {
  const view = doc.defaultView!
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (node === doc.documentElement || node === doc.body) return false
    const overflowX = view.getComputedStyle(node).overflowX
    if (overflowX !== 'visible') return true
  }
  return false
}

function overflowingElements(doc: Document): string[] {
  const limit = doc.documentElement.clientWidth
  return Array.from(doc.querySelectorAll('body *'))
    .filter((el) => {
      const rect = el.getBoundingClientRect()
      return (
        rect.width > 0 &&
        Math.ceil(rect.right) > limit + 1 &&
        !hasScrollingAncestor(el, doc)
      )
    })
    .sort(
      (a, b) =>
        b.getBoundingClientRect().right - a.getBoundingClientRect().right
    )
    .slice(0, 5)
    .map(
      (el) =>
        `${describeElement(el)} reaches ${Math.round(el.getBoundingClientRect().right)}px`
    )
}

export function assertNoHorizontalScroll(): void {
  cy.document().then((doc) => {
    expect(
      doc.body.scrollWidth,
      `content is wider than the viewport; widest elements: ${overflowingElements(doc).join(' | ')}`
    ).to.be.at.most(doc.documentElement.clientWidth)
  })
}
