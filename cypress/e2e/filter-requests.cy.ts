import { API_URL, authHeaders, DESKTOP, login, USERS } from '../support/e2e'

const ROWS = '[data-testid="data-table"] tbody:not([data-testid]) tr'

const SEARCH = '#filter-search'

const DEPARTMENT = '#filter-department'

const TERM = 'jones'

interface CompanyRequest {
  employee_name: string | null
  department_id: number | null
}

interface Department {
  id: number
  name: string
}

function companyRequests(): Cypress.Chainable<CompanyRequest[]> {
  return authHeaders(USERS.admin).then((headers) =>
    cy
      .request({ url: `${API_URL}/api/leave-requests`, headers })
      .then((res) => res.body.data as CompanyRequest[])
  )
}

function departments(): Cypress.Chainable<Department[]> {
  return authHeaders(USERS.admin).then((headers) =>
    cy
      .request({ url: `${API_URL}/api/departments`, headers })
      .then((res) => res.body.data as Department[])
  )
}

function departmentId(all: Department[], name: string): number {
  const match = all.find((department) => department.name === name)
  expect(match, `a "${name}" department`).to.not.equal(undefined)
  return match!.id
}

function matching(
  requests: CompanyRequest[],
  term: string,
  department: number
): number {
  return requests.filter(
    (request) =>
      (request.employee_name ?? '').toLowerCase().includes(term) &&
      request.department_id === department
  ).length
}

function openAllRequests(): void {
  login(USERS.admin, '/')
  cy.get('[data-testid="screen-admin-dashboard"]').should('be.visible')
  cy.visit('/requests')
  cy.contains('h1', 'All requests').should('be.visible')
  cy.get('[data-testid="table-loading-state"]').should('not.exist')
}

describe('searching and filtering the requests table', () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
  })

  it('combines a name search with a department filter', () => {
    companyRequests().then((requests) => {
      departments().then((all) => {
        const engineering = departmentId(all, 'Engineering')
        const expected = matching(requests, TERM, engineering)
        expect(
          expected,
          'seeded Engineering requests for the search term'
        ).to.be.greaterThan(0)

        openAllRequests()
        cy.get(ROWS).should('have.length', requests.length)

        cy.get(SEARCH).type(TERM)
        cy.get(ROWS).should('have.length.lessThan', requests.length)

        cy.get(DEPARTMENT).select(String(engineering))
        cy.get(ROWS).should('have.length', expected)
        cy.get(ROWS).each((row) => {
          expect(row.find('td button').text().toLowerCase()).to.include(TERM)
        })
      })
    })
  })

  it('offers a way out when the combined filters match nothing', () => {
    companyRequests().then((requests) => {
      departments().then((all) => {
        openAllRequests()

        cy.get(SEARCH).type(TERM)
        cy.get(DEPARTMENT).select(String(departmentId(all, 'Marketing')))

        cy.get('[data-testid="table-empty-state"]')
          .should('contain.text', 'No requests match these filters.')
          .contains('button', 'Clear filters')
          .click()

        cy.get(ROWS).should('have.length', requests.length)
        cy.get(SEARCH).should('have.value', '')
        cy.get(DEPARTMENT).should('have.value', '')
      })
    })
  })
})
