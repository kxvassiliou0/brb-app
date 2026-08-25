import { describe, expect, it } from 'vitest'
import {
  buildUpdateBody,
  canDeleteEmployee,
  deletionConsequences,
  directReports,
  draftFromRecord,
  fullName,
  hasEmployeeErrors,
  PASSWORD_MIN_LENGTH,
  validateEmployee,
  type EmployeeDraft,
} from '@/lib/employeeAdmin'
import type { UserListItem, UserRecord } from '@/types/api'

const RECORD: UserRecord = {
  id: 4,
  firstName: 'David',
  lastName: 'Jones',
  email: 'david.jones@company.com',
  role: 'Employee',
  annualLeaveAllowance: 22,
  departmentId: 1,
  jobRoleId: 5,
  managerId: 2,
}

function listItem(overrides: Partial<UserListItem> = {}): UserListItem {
  return {
    id: 4,
    firstName: 'David',
    lastName: 'Jones',
    email: 'david.jones@company.com',
    role: 'Employee',
    annualLeaveAllowance: 22,
    department: { id: 1, name: 'Engineering' },
    jobRole: { id: 5, name: 'Contractor' },
    manager: { id: 2, name: 'Bob Mitchell' },
    ...overrides,
  }
}

function draft(overrides: Partial<EmployeeDraft> = {}): EmployeeDraft {
  return { ...draftFromRecord(RECORD), ...overrides }
}

describe('the draft built from a fetched record', () => {
  it('carries every editable field across', () => {
    expect(draftFromRecord(RECORD)).toEqual({
      firstName: 'David',
      lastName: 'Jones',
      email: 'david.jones@company.com',
      role: 'Employee',
      annualLeaveAllowance: '22',
      departmentId: '1',
      jobRoleId: '5',
      managerId: '2',
      password: '',
    })
  })

  it('leaves the password blank rather than inventing a placeholder', () => {
    expect(draftFromRecord(RECORD).password).toBe('')
  })

  it('represents an absent line manager as an empty choice', () => {
    expect(draftFromRecord({ ...RECORD, managerId: null }).managerId).toBe('')
  })
})

describe('the update payload', () => {
  it('omits the password key entirely when the field is left blank', () => {
    const body = buildUpdateBody(draft({ password: '' }))

    expect(body).not.toHaveProperty('password')
    expect(Object.keys(body)).not.toContain('password')
  })

  it('includes the password only when one was typed', () => {
    expect(
      buildUpdateBody(draft({ password: 'a-longer-secret' }))
    ).toMatchObject({ password: 'a-longer-secret' })
  })

  it('sends the remaining fields as the numbers and strings the API expects', () => {
    expect(buildUpdateBody(draft())).toEqual({
      firstName: 'David',
      lastName: 'Jones',
      email: 'david.jones@company.com',
      role: 'Employee',
      annualLeaveAllowance: 22,
      departmentId: 1,
      jobRoleId: 5,
      managerId: 2,
    })
  })

  it('clears the line manager as null rather than as an empty string', () => {
    expect(buildUpdateBody(draft({ managerId: '' })).managerId).toBeNull()
  })

  it('trims whitespace from the name and email', () => {
    const body = buildUpdateBody(
      draft({ firstName: '  David ', lastName: ' Jones  ', email: ' d@c.com ' })
    )

    expect(body.firstName).toBe('David')
    expect(body.lastName).toBe('Jones')
    expect(body.email).toBe('d@c.com')
  })
})

describe('validating an edited employee', () => {
  it('accepts an unchanged record', () => {
    expect(hasEmployeeErrors(validateEmployee(draft(), RECORD.id))).toBe(false)
  })

  it('accepts a blank password, because blank means keep the current one', () => {
    expect(validateEmployee(draft({ password: '' })).password).toBeUndefined()
  })

  it.each([1, PASSWORD_MIN_LENGTH - 1])(
    'rejects a supplied password of %i characters',
    (length) => {
      const errors = validateEmployee(draft({ password: 'a'.repeat(length) }))

      expect(errors.password).toBe(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`
      )
      expect(hasEmployeeErrors(errors)).toBe(true)
    }
  )

  it.each([PASSWORD_MIN_LENGTH, PASSWORD_MIN_LENGTH + 5])(
    'accepts a supplied password of %i characters',
    (length) => {
      expect(
        validateEmployee(draft({ password: 'a'.repeat(length) })).password
      ).toBeUndefined()
    }
  )

  it('requires a first name, a last name and an email', () => {
    const errors = validateEmployee(
      draft({ firstName: ' ', lastName: '', email: '' })
    )

    expect(errors.firstName).toBeDefined()
    expect(errors.lastName).toBeDefined()
    expect(errors.email).toBeDefined()
  })

  it('rejects an email that is not an address', () => {
    expect(
      validateEmployee(draft({ email: 'david.jones' })).email
    ).toBeDefined()
  })

  it.each(['0', '-3', '2.5', ''])(
    'rejects an annual leave allowance of "%s"',
    (allowance) => {
      expect(
        validateEmployee(draft({ annualLeaveAllowance: allowance }))
          .annualLeaveAllowance
      ).toBeDefined()
    }
  )

  it('refuses to make someone their own line manager', () => {
    expect(
      validateEmployee(draft({ managerId: String(RECORD.id) }), RECORD.id)
        .managerId
    ).toBe('Someone cannot be their own line manager')
  })
})

describe('who an Admin may delete', () => {
  it('refuses the account the Admin is signed in as', () => {
    expect(canDeleteEmployee(listItem({ id: 1 }), 1)).toBe(false)
  })

  it('allows any other account', () => {
    expect(canDeleteEmployee(listItem({ id: 4 }), 1)).toBe(true)
  })
})

describe('the consequences named before a deletion', () => {
  const bob = listItem({
    id: 2,
    firstName: 'Bob',
    lastName: 'Mitchell',
    role: 'Manager',
    manager: null,
  })
  const eve = listItem({
    id: 5,
    firstName: 'Eve',
    lastName: 'Knowles',
    manager: { id: 2, name: 'Bob Mitchell' },
  })
  const grace = listItem({
    id: 7,
    firstName: 'Grace',
    lastName: 'Williams',
    manager: null,
  })

  it('names the leave requests that cascade away with that specific person', () => {
    const [cascade] = deletionConsequences(eve, [bob, eve, grace])

    expect(cascade).toContain('Eve Knowles')
    expect(cascade).toContain('leave request')
    expect(cascade).toContain('deleted')
  })

  it('finds the reports who point at the manager being deleted', () => {
    expect(directReports([bob, eve, grace], bob.id)).toEqual([eve])
  })

  it('warns that a deleted manager leaves their reports without a line manager', () => {
    const warning = deletionConsequences(bob, [bob, eve, grace]).find((text) =>
      text.includes('line manager')
    )

    expect(warning).toContain('Eve Knowles')
    expect(warning).toContain('kept')
    expect(warning).toContain('without a line manager')
  })

  it('counts the reports when a manager has more than one', () => {
    const david = listItem({ id: 4, manager: { id: 2, name: 'Bob Mitchell' } })
    const warning = deletionConsequences(bob, [bob, eve, david]).find((text) =>
      text.includes('line manager')
    )

    expect(warning).toContain('2 people report to Bob Mitchell')
  })

  it('says nothing about reports for someone who manages nobody', () => {
    const texts = deletionConsequences(grace, [bob, eve, grace]).join(' ')

    expect(texts).not.toContain('line manager')
  })

  it('promises the review history survives when the person could have reviewed', () => {
    const texts = deletionConsequences(bob, [bob, eve, grace]).join(' ')

    expect(texts).toContain('stay in the history')
    expect(texts).toContain('no longer name who reviewed them')
  })

  it('leaves the review note out for an Employee who cannot review', () => {
    const texts = deletionConsequences(grace, [bob, eve, grace]).join(' ')

    expect(texts).not.toContain('stay in the history')
  })
})

describe('an employee name', () => {
  it('joins the first and last name', () => {
    expect(fullName(RECORD)).toBe('David Jones')
  })
})
