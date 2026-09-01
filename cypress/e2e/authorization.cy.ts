import { DESKTOP, login, USERS } from '../support/e2e'

interface Screen {
  name: string
  path: string
  testId: string
}

const DASHBOARD: Record<string, Screen> = {
  Employee: {
    name: 'Dashboard',
    path: '/',
    testId: 'screen-employee-dashboard',
  },
  Manager: { name: 'Dashboard', path: '/', testId: 'screen-manager-dashboard' },
  Admin: { name: 'Dashboard', path: '/', testId: 'screen-admin-dashboard' },
}

const REQUESTS: Screen = {
  name: 'Requests',
  path: '/requests',
  testId: 'screen-requests',
}
const SETTINGS: Screen = {
  name: 'Settings',
  path: '/settings',
  testId: 'screen-settings',
}
const TEAM_CALENDAR: Screen = {
  name: 'Team calendar',
  path: '/team-calendar',
  testId: 'screen-team-calendar',
}
const EMPLOYEES: Screen = {
  name: 'Employees',
  path: '/employees',
  testId: 'screen-employees',
}
const DEPARTMENTS: Screen = {
  name: 'Departments',
  path: '/departments',
  testId: 'screen-departments',
}

const RESTRICTED = [TEAM_CALENDAR, EMPLOYEES, DEPARTMENTS]

interface RoleExpectation {
  role: string
  email: string
  reaches: Screen[]
  navigation: string[]
}

const ROLES: RoleExpectation[] = [
  {
    role: 'Employee',
    email: USERS.employee,
    reaches: [DASHBOARD.Employee!, REQUESTS, SETTINGS],
    navigation: ['Dashboard', 'Requests', 'Settings'],
  },
  {
    role: 'Manager',
    email: USERS.manager,
    reaches: [DASHBOARD.Manager!, REQUESTS, SETTINGS, TEAM_CALENDAR],
    navigation: ['Dashboard', 'Requests', 'Team calendar', 'Settings'],
  },
  {
    role: 'Admin',
    email: USERS.admin,
    reaches: [
      DASHBOARD.Admin!,
      REQUESTS,
      SETTINGS,
      TEAM_CALENDAR,
      EMPLOYEES,
      DEPARTMENTS,
    ],
    navigation: [
      'Dashboard',
      'Requests',
      'Employees',
      'Departments',
      'Team calendar',
      'Settings',
    ],
  },
]

function refusedScreens(reaches: Screen[]): Screen[] {
  const allowed = reaches.map((screen) => screen.path)
  return RESTRICTED.filter((screen) => !allowed.includes(screen.path))
}

for (const { role, email, reaches, navigation } of ROLES) {
  describe(`what ${role === 'Admin' ? 'an' : 'a'} ${role} can see`, () => {
    beforeEach(() => {
      cy.viewport(DESKTOP.width, DESKTOP.height)
      cy.clearLocalStorage()
      login(email)
    })

    it('opens the screens it is entitled to and no others', () => {
      for (const screen of reaches) {
        cy.visit(screen.path)
        cy.get(`[data-testid="${screen.testId}"]`).should('be.visible')
      }

      for (const screen of refusedScreens(reaches)) {
        cy.visit(screen.path)
        cy.get('[data-testid="app-layout"]').should('exist')
        cy.get(`[data-testid="${screen.testId}"]`).should('not.exist')
        cy.location('pathname').should('eq', '/')
      }
    })

    it('is offered exactly those destinations in the navigation', () => {
      cy.get('[data-testid="sidebar"]')
        .find('a')
        .should(($links) => {
          const labels = $links.toArray().map((l) => l.textContent?.trim())
          expect(labels).to.deep.equal(navigation)
        })
    })
  })
}
