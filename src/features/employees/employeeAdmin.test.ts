import { StatusCodes } from 'http-status-codes'
import { describe, expect, it } from 'vitest'
import { ApiRequestError } from '@/api/client'
import {
  buildCreateBody,
  buildUpdateBody,
  canDeleteEmployee,
  DEFAULT_ANNUAL_LEAVE_ALLOWANCE,
  deletionConsequences,
  directReports,
  draftFromRecord,
  emptyEmployeeDraft,
  fullName,
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

describe('the draft a new employee starts from', () => {
  it('starts every typed field empty, so nothing is invented for the Admin', () => {
    const blank = emptyEmployeeDraft()

    expect(blank.firstName).toBe('')
    expect(blank.lastName).toBe('')
    expect(blank.email).toBe('')
    expect(blank.password).toBe('')
    expect(blank.departmentId).toBe('')
    expect(blank.jobRoleId).toBe('')
  })

  it('defaults the allowance to the twenty five days the entity defaults to', () => {
    expect(DEFAULT_ANNUAL_LEAVE_ALLOWANCE).toBe(25)
    expect(emptyEmployeeDraft().annualLeaveAllowance).toBe('25')
  })

  it('defaults to the least privileged role and to no line manager', () => {
    expect(emptyEmployeeDraft().role).toBe('Employee')
    expect(emptyEmployeeDraft().managerId).toBe('')
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

  it('accepts a fully completed draft', () => {
    expect(hasEmployeeErrors(validateNewEmployee(newDraft()))).toBe(false)
  })

  it('requires a password, because a new starter has none to keep', () => {
    expect(validateNewEmployee(newDraft({ password: '' })).password).toBe(
      'Please enter a password'
    )
  })

  it('still holds a typed password to the ten character minimum', () => {
    expect(validateNewEmployee(newDraft({ password: 'short' })).password).toBe(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`
    )
  })

  it.each([
    ['firstName', 'firstName'],
    ['lastName', 'lastName'],
    ['email', 'email'],
    ['departmentId', 'departmentId'],
    ['jobRoleId', 'jobRoleId'],
  ] as const)('requires %s', (_name, key) => {
    expect(validateNewEmployee(newDraft({ [key]: '' }))[key]).toBeDefined()
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

  it('sends the trimmed strings and parsed numbers the API expects', () => {
    expect(buildCreateBody(newDraft())).toEqual({
      firstName: 'Nina',
      lastName: 'Newstarter',
      email: 'nina@company.com',
      role: 'Employee',
      annualLeaveAllowance: DEFAULT_ANNUAL_LEAVE_ALLOWANCE,
      departmentId: 2,
      jobRoleId: 5,
      managerId: null,
      password: 'first-password',
    })
  })

  it('sends a null managerId when no line manager was chosen', () => {
    expect(buildCreateBody(newDraft({ managerId: '' })).managerId).toBeNull()
  })
})

describe('recognising a refused duplicate email', () => {
  it('recognises the conflict status the API answers with', () => {
    expect(
      isDuplicateEmailError(new ApiRequestError('Nope', StatusCodes.CONFLICT))
    ).toBe(true)
  })

  it.each([
    'That email address already belongs to another user',
    "Duplicate entry 'nina@company.com' for key 'IDX_97'",
    'UNIQUE constraint failed: user.email',
  ])('recognises "%s"', (message) => {
    expect(isDuplicateEmailError(new ApiRequestError(message, 400))).toBe(true)
  })

  it('leaves an unrelated refusal alone', () => {
    expect(
      isDuplicateEmailError(
        new ApiRequestError('Annual leave allowance must be positive', 422)
      )
    ).toBe(false)
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
