import {
  API_URL,
  apiRemoveDepartmentsByName,
  apiRemoveJobRolesByName,
  apiRemovePublicHolidaysByName,
  apiRemoveUsersByEmail,
  authHeaders,
  USERS,
} from '../support/e2e'

type Role = 'Employee' | 'Manager' | 'Admin'

const EMAIL: Record<Role, string> = {
  Employee: USERS.employee,
  Manager: USERS.manager,
  Admin: USERS.admin,
}

const REFUSAL_CODES = [401, 403]

interface Endpoint {
  name: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  url: string
  body?: Record<string, unknown>
  allowed: Role[]
}

const ENDPOINTS: Endpoint[] = [
  {
    name: 'list every user',
    method: 'GET',
    url: '/api/users',
    allowed: ['Admin'],
  },
  {
    name: 'create a user',
    method: 'POST',
    url: '/api/users',
    body: { firstName: 'No', lastName: 'Entry', email: 'no.entry@company.com' },
    allowed: ['Admin'],
  },
  {
    name: 'delete a user',
    method: 'DELETE',
    url: '/api/users/999999',
    allowed: ['Admin'],
  },
  {
    name: 'list every leave request',
    method: 'GET',
    url: '/api/leave-requests',
    allowed: ['Admin', 'Manager'],
  },
  {
    name: 'approve a leave request',
    method: 'PATCH',
    url: '/api/leave-requests/approve',
    body: { leave_request_id: 999999 },
    allowed: ['Admin', 'Manager'],
  },
  {
    name: 'reject a leave request',
    method: 'PATCH',
    url: '/api/leave-requests/reject',
    body: { leave_request_id: 999999, manager_note: 'no' },
    allowed: ['Admin', 'Manager'],
  },
  {
    name: 'create a department',
    method: 'POST',
    url: '/api/departments',
    body: { name: 'Unauthorised department' },
    allowed: ['Admin'],
  },
  {
    name: 'create a job role',
    method: 'POST',
    url: '/api/job-roles',
    body: { name: 'Unauthorised job role' },
    allowed: ['Admin'],
  },
  {
    name: 'create a public holiday',
    method: 'POST',
    url: '/api/public-holidays',
    body: { date: '2027-02-01', name: 'Unauthorised holiday' },
    allowed: ['Admin'],
  },
]

const ROLES: Role[] = ['Employee', 'Manager', 'Admin']

function callAs(role: Role, endpoint: Endpoint) {
  return authHeaders(EMAIL[role]).then((headers) =>
    cy.request({
      method: endpoint.method,
      url: `${API_URL}${endpoint.url}`,
      headers,
      body: endpoint.body,
      failOnStatusCode: false,
    })
  )
}

describe('the API refuses unauthorised calls rather than hiding them', () => {
  after(() => {
    apiRemoveUsersByEmail(['no.entry@company.com'])
    apiRemoveDepartmentsByName(['Unauthorised department'])
    apiRemoveJobRolesByName(['Unauthorised job role'])
    apiRemovePublicHolidaysByName(['Unauthorised holiday'])
  })

  for (const endpoint of ENDPOINTS) {
    for (const role of ROLES) {
      const permitted = endpoint.allowed.includes(role)

      it(`${permitted ? 'lets' : 'refuses'} ${role} ${endpoint.name}`, () => {
        callAs(role, endpoint).then((response) => {
          if (permitted) {
            expect(
              REFUSAL_CODES,
              `${role} holds the right to ${endpoint.name}, got ${response.status}`
            ).to.not.include(response.status)
          } else {
            expect(
              response.status,
              `${role} must be refused ${endpoint.name}`
            ).to.be.oneOf(REFUSAL_CODES)
          }
        })
      })
    }
  }

  it('refuses every guarded endpoint outright with no token', () => {
    for (const endpoint of ENDPOINTS) {
      cy.request({
        method: endpoint.method,
        url: `${API_URL}${endpoint.url}`,
        body: endpoint.body,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status, `${endpoint.name} without a token`).to.be.oneOf(
          REFUSAL_CODES
        )
      })
    }
  })

  it("refuses one employee a read of another employee's requests", () => {
    authHeaders(USERS.employee).then((headers) => {
      cy.request({
        url: `${API_URL}/api/leave-requests/status/6`,
        headers,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf(REFUSAL_CODES)
      })
    })
  })
})
