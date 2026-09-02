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

export interface ApiOrgUnit {
  id: number
  name: string
  userCount: number
}

function apiOrgUnits(basePath: string): Cypress.Chainable<ApiOrgUnit[]> {
  return asAdmin((headers) =>
    cy
      .request({ method: 'GET', url: `${API_URL}${basePath}`, headers })
      .then((response) => (response.body.data ?? []) as ApiOrgUnit[])
  )
}

function apiRemoveOrgUnitsByName(basePath: string, names: string[]): void {
  apiOrgUnits(basePath).then((units) => {
    units
      .filter((unit) => names.includes(unit.name))
      .forEach((unit) => {
        asAdmin((headers) =>
          cy.request({
            method: 'DELETE',
            url: `${API_URL}${basePath}/${unit.id}`,
            headers,
            failOnStatusCode: false,
          })
        )
      })
  })
}

export function apiRemoveJobRolesByName(names: string[]): void {
  apiRemoveOrgUnitsByName('/api/job-roles', names)
}

export function apiRemoveDepartmentsByName(names: string[]): void {
  apiRemoveOrgUnitsByName('/api/departments', names)
}

export function apiAddPublicHoliday(date: string, name: string): void {
  asAdmin((headers) =>
    cy.request({
      method: 'POST',
      url: `${API_URL}/api/public-holidays`,
      headers,
      body: { date, name },
      failOnStatusCode: false,
    })
  )
}

export function apiRemovePublicHolidaysByName(names: string[]): void {
  asAdmin((headers) =>
    cy
      .request({
        method: 'GET',
        url: `${API_URL}/api/public-holidays`,
        headers,
      })
      .then((response) => {
        const holidays = (response.body ?? []) as { id: number; name: string }[]
        holidays
          .filter((holiday) => names.includes(holiday.name))
          .forEach((holiday) =>
            cy.request({
              method: 'DELETE',
              url: `${API_URL}/api/public-holidays/${holiday.id}`,
              headers,
              failOnStatusCode: false,
            })
          )
      })
  )
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

export const WCAG_143_TEXT_MINIMUM = 4.5

export const WCAG_1411_BOUNDARY_MINIMUM = 3

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function parseRgb(value: string): [number, number, number] {
  const parts = value.match(/\d+(\.\d+)?/g)
  if (!parts || parts.length < 3) throw new Error(`Unreadable colour ${value}`)
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])]
}

export function luminance(value: string): number {
  const [r, g, b] = parseRgb(value)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrast(a: string, b: string): number {
  const x = luminance(a)
  const y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

export function backgroundBehind(el: Element, view: Window): string {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const colour = view.getComputedStyle(node).backgroundColor
    if (colour && !colour.startsWith('rgba(0, 0, 0, 0)')) return colour
  }
  return 'rgb(255, 255, 255)'
}

export function tab(): void {
  cy.press(Cypress.Keyboard.Keys.TAB)
}

export function focusedDescription(): Cypress.Chainable<string> {
  return cy
    .document()
    .then((doc) => describeElement(doc.activeElement ?? doc.body))
}

export function signOut(): void {
  cy.visit('/settings')
  cy.get('[data-testid="session-section"]').should('be.visible')
  cy.get('[data-testid="session-section"]').find('button').click()
  cy.url().should('include', '/login')
}

export function openRequests(email: string): void {
  login(email, '/')
  cy.visit('/requests')
  cy.get('[data-testid="screen-requests"]').should('be.visible')
  cy.get('[data-testid="table-loading-state"]').should('not.exist')
}

export function filterBy(testId: string, value: string): void {
  cy.get(`[data-testid="${testId}"]`).find(`[data-value="${value}"]`).click()
}

export function row(id: number): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get(`[data-row-key="${id}"]`)
}

export function remainingDays(): Cypress.Chainable<number> {
  return cy
    .get('[data-testid="page-description"]')
    .invoke('text')
    .then((text) => {
      const match = /(\d+) days remaining/.exec(text)
      expect(match, 'the header states the balance').to.not.equal(null)
      return Number(match?.[1])
    })
}

export function createRequestAs(
  email: string,
  start: string,
  end: string,
  reason: string
): Cypress.Chainable<number> {
  return authHeaders(email).then((headers) =>
    cy
      .request({
        method: 'POST',
        url: `${API_URL}/api/leave-requests`,
        headers,
        body: {
          start_date: start,
          end_date: end,
          leave_type: 'Vacation',
          reason,
        },
      })
      .then((res) => Number(res.body.data.id))
  )
}

export function isoDate(monthsAhead: number, dayOfMonth: number): string {
  const today = new Date()
  return new Date(
    Date.UTC(today.getFullYear(), today.getMonth() + monthsAhead, dayOfMonth)
  )
    .toISOString()
    .slice(0, 10)
}
