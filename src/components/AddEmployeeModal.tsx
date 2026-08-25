import { useEffect, useState, type FormEvent } from 'react'
import Button from '@/components/Button'
import FormAlert from '@/components/FormAlert'
import InputWithLabel, {
  SelectWithLabel,
  type SelectOption,
} from '@/components/InputWithLabel'
import Modal from '@/components/Modal'
import { ErrorState, LoadingState } from '@/components/states'
import { getApiErrorMessage } from '@/lib/api'
import { cachedGet } from '@/lib/apiCache'
import {
  createEmployee,
  DUPLICATE_EMAIL_MESSAGE,
  emptyEmployeeDraft,
  fullName,
  hasEmployeeErrors,
  isDuplicateEmailError,
  PASSWORD_MIN_LENGTH,
  ROLES,
  validateNewEmployee,
  type EmployeeDraft,
  type EmployeeErrors,
} from '@/lib/employeeAdmin'
import type {
  ApiSuccess,
  DepartmentRow,
  JobRoleRow,
  UserListItem,
} from '@/types/api'

export const NO_MANAGER_OPTION = 'No line manager'

export const ADD_EMPLOYEE_LABEL = 'Add an employee'

interface AddEmployeeModalProps {
  employees: UserListItem[]
  onClose: () => void
  onCreated: () => void
}

interface Choices {
  departments: DepartmentRow[]
  jobRoles: JobRoleRow[]
}

function namedOptions(rows: { id: number; name: string }[]): SelectOption[] {
  return rows.map((row) => ({ value: String(row.id), label: row.name }))
}

export default function AddEmployeeModal({
  employees,
  onClose,
  onCreated,
}: AddEmployeeModalProps) {
  const [draft, setDraft] = useState<EmployeeDraft>(emptyEmployeeDraft)
  const [choices, setChoices] = useState<Choices | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [errors, setErrors] = useState<EmployeeErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      cachedGet<ApiSuccess<DepartmentRow[]>>('/api/departments'),
      cachedGet<ApiSuccess<JobRoleRow[]>>('/api/job-roles'),
    ])
      .then(([departmentList, jobRoleList]) => {
        if (cancelled) return
        setChoices({
          departments: departmentList.data,
          jobRoles: jobRoleList.data,
        })
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error)
      })

    return () => {
      cancelled = true
    }
  }, [attempt])

  function update(patch: Partial<EmployeeDraft>): void {
    setDraft((current) => ({ ...current, ...patch }))
    setErrors({})
    setSubmitError(null)
  }

  function retry(): void {
    setLoadError(null)
    setAttempt((value) => value + 1)
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()

    const found = validateNewEmployee(draft)
    setErrors(found)
    if (hasEmployeeErrors(found)) return

    setSubmitError(null)
    setSubmitting(true)
    try {
      await createEmployee(draft)
      onCreated()
      onClose()
    } catch (error) {
      if (isDuplicateEmailError(error)) {
        setErrors({ email: DUPLICATE_EMAIL_MESSAGE })
      } else {
        setSubmitError(getApiErrorMessage(error, 'Could not add this employee'))
      }
      setSubmitting(false)
    }
  }

  return (
    <Modal label={ADD_EMPLOYEE_LABEL} onClose={onClose}>
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl md:text-3xl">{ADD_EMPLOYEE_LABEL}</h2>
        <p className="text-sm text-text-secondary">
          They can sign in and book leave as soon as you save them.
        </p>
      </div>

      {loadError ? (
        <ErrorState
          error={loadError}
          onRetry={retry}
          fallbackMessage="Could not load departments and job roles"
        />
      ) : choices === null ? (
        <LoadingState label="Loading departments and job roles" />
      ) : (
        <form
          onSubmit={handleSubmit}
          data-testid="add-employee-form"
          className="flex flex-col gap-5"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <InputWithLabel
              id="employee-first-name"
              label="First name"
              value={draft.firstName}
              onChange={(firstName) => update({ firstName })}
              autoComplete="given-name"
              error={errors.firstName}
            />
            <InputWithLabel
              id="employee-last-name"
              label="Last name"
              value={draft.lastName}
              onChange={(lastName) => update({ lastName })}
              autoComplete="family-name"
              error={errors.lastName}
            />
          </div>

          <InputWithLabel
            id="employee-email"
            label="Email"
            type="email"
            value={draft.email}
            onChange={(email) => update({ email })}
            autoComplete="email"
            error={errors.email}
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <SelectWithLabel
              id="employee-department"
              label="Department"
              value={draft.departmentId}
              onChange={(departmentId) => update({ departmentId })}
              options={namedOptions(choices.departments)}
              placeholder="Select a department"
              error={errors.departmentId}
            />
            <SelectWithLabel
              id="employee-job-role"
              label="Job role"
              value={draft.jobRoleId}
              onChange={(jobRoleId) => update({ jobRoleId })}
              options={namedOptions(choices.jobRoles)}
              placeholder="Select a job role"
              error={errors.jobRoleId}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <SelectWithLabel
              id="employee-role"
              label="Role"
              value={draft.role}
              onChange={(role) =>
                update({ role: role as EmployeeDraft['role'] })
              }
              options={ROLES.map((role) => ({ value: role, label: role }))}
            />
            <SelectWithLabel
              id="employee-manager"
              label="Line manager"
              value={draft.managerId}
              onChange={(managerId) => update({ managerId })}
              options={namedOptions(
                employees.map((candidate) => ({
                  id: candidate.id,
                  name: fullName(candidate),
                }))
              )}
              placeholder={NO_MANAGER_OPTION}
              error={errors.managerId}
            />
          </div>

          <InputWithLabel
            id="employee-allowance"
            label="Annual leave allowance (days)"
            type="number"
            value={draft.annualLeaveAllowance}
            onChange={(annualLeaveAllowance) =>
              update({ annualLeaveAllowance })
            }
            error={errors.annualLeaveAllowance}
          />

          <InputWithLabel
            id="employee-password"
            label="Password"
            type="password"
            value={draft.password}
            onChange={(password) => update({ password })}
            autoComplete="new-password"
            placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
            hint="They will use this to sign in for the first time."
            error={errors.password}
          />

          {submitError && <FormAlert message={submitError} />}

          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add employee'}
            </Button>
            <Button variant="secondary" disabled={submitting} onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
