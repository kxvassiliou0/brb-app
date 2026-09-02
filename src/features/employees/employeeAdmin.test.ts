import { StatusCodes } from 'http-status-codes'
import { describe, expect, it } from 'vitest'
import { ApiRequestError } from '@/api/client'
import {
  buildCreateBody,
  buildUpdateBody,
  canDeleteEmployee,
  deletionConsequences,
  draftFromRecord,
  emptyEmployeeDraft,
  hasEmployeeErrors,
  isDuplicateEmailError,
  PASSWORD_MIN_LENGTH,
  validateEmployee,
  validateNewEmployee,
  type EmployeeDraft,
} from '@/features/employees/employeeAdmin'
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
})

describe('the update payload', () => {
  it('omits the password key entirely when the field is left blank', () => {
    const body = buildUpdateBody(draft({ password: '' }))

    expect(body).not.toHaveProperty('password')
    expect(Object.keys(body)).not.toContain('password')
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
})

describe('validating an edited employee', () => {
  it('holds a supplied password to the minimum length', () => {
    for (const length of [1, PASSWORD_MIN_LENGTH - 1]) {
      const errors = validateEmployee(draft({ password: 'a'.repeat(length) }))

      expect(errors.password, `${length} characters`).toBe(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`
      )
      expect(hasEmployeeErrors(errors)).toBe(true)
    }

    for (const length of [PASSWORD_MIN_LENGTH, PASSWORD_MIN_LENGTH + 5]) {
      expect(
        validateEmployee(draft({ password: 'a'.repeat(length) })).password,
        `${length} characters`
      ).toBeUndefined()
    }
  })

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

  it('rejects any allowance that is not a positive whole number', () => {
    for (const allowance of ['0', '-3', '2.5', '']) {
      expect(
        validateEmployee(draft({ annualLeaveAllowance: allowance }))
          .annualLeaveAllowance,
        allowance
      ).toBeDefined()
    }
  })

  it('refuses to make someone their own line manager', () => {
    expect(
      validateEmployee(draft({ managerId: String(RECORD.id) }), RECORD.id)
        .managerId
    ).toBe('Someone cannot be their own line manager')
  })
})

describe('validating a new employee', () => {
  function newDraft(overrides: Partial<EmployeeDraft> = {}): EmployeeDraft {
    return {
      ...emptyEmployeeDraft(),
      firstName: 'Nina',
      lastName: 'Newstarter',
      email: 'nina@company.com',
      departmentId: '1',
      jobRoleId: '5',
      password: 'first-password',
      ...overrides,
    }
  }

  it('requires a password, because a new starter has none to keep', () => {
    expect(validateNewEmployee(newDraft({ password: '' })).password).toBe(
      'Please enter a password'
    )
  })

  it('requires every mandatory field', () => {
    for (const key of [
      'firstName',
      'lastName',
      'email',
      'departmentId',
      'jobRoleId',
    ] as const) {
      expect(
        validateNewEmployee(newDraft({ [key]: '' }))[key],
        key
      ).toBeDefined()
    }
  })
})

describe('the create payload', () => {
  function newDraft(overrides: Partial<EmployeeDraft> = {}): EmployeeDraft {
    return {
      ...emptyEmployeeDraft(),
      firstName: ' Nina ',
      lastName: 'Newstarter',
      email: ' nina@company.com ',
      departmentId: '2',
      jobRoleId: '5',
      password: 'first-password',
      ...overrides,
    }
  }

  it('always carries the password, unlike the update payload', () => {
    expect(buildCreateBody(newDraft()).password).toBe('first-password')
  })
})

describe('recognising a refused duplicate email', () => {
  it('recognises the conflict status the API answers with', () => {
    expect(
      isDuplicateEmailError(new ApiRequestError('Nope', StatusCodes.CONFLICT))
    ).toBe(true)
  })

  it('recognises every wording the backend uses for it', () => {
    for (const message of [
      'That email address already belongs to another user',
      "Duplicate entry 'nina@company.com' for key 'IDX_97'",
      'UNIQUE constraint failed: user.email',
    ]) {
      expect(
        isDuplicateEmailError(new ApiRequestError(message, 400)),
        message
      ).toBe(true)
    }
  })
})

describe('who an Admin may delete', () => {
  it('refuses the account the Admin is signed in as', () => {
    expect(canDeleteEmployee(listItem({ id: 1 }), 1)).toBe(false)
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

  it('warns that a deleted manager leaves their reports without a line manager', () => {
    const warning = deletionConsequences(bob, [bob, eve, grace]).find((text) =>
      text.includes('line manager')
    )

    expect(warning).toContain('Eve Knowles')
    expect(warning).toContain('kept')
    expect(warning).toContain('without a line manager')
  })

  it('promises the review history survives when the person could have reviewed', () => {
    const texts = deletionConsequences(bob, [bob, eve, grace]).join(' ')

    expect(texts).toContain('stay in the history')
    expect(texts).toContain('no longer name who reviewed them')
  })
})
