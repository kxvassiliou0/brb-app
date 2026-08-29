import { useEffect, useState, type FormEvent } from 'react'
import FormAlert from '@/components/ui/FormAlert'
import InputWithLabel, {
  SelectWithLabel,
  type SelectOption,
} from '@/components/ui/InputWithLabel'
import Modal from '@/components/ui/Modal'
import { ErrorState, LoadingState } from '@/components/ui/states'
import { apiFetch, getApiErrorMessage } from '@/lib/api'
import { cachedGet } from '@/lib/apiCache'
import {
  draftFromRecord,
  fullName,
  hasEmployeeErrors,
  KEEP_PASSWORD_HINT,
  PASSWORD_MIN_LENGTH,
  ROLES,
  updateEmployee,
  userPath,
  validateEmployee,
  type EmployeeDraft,
  type EmployeeErrors,
} from '@/lib/employeeAdmin'
import type {
  ApiSuccess,
  DepartmentRow,
  JobRoleRow,
  UserListItem,
  UserRecord,
} from '@/types/api'

const FORM_ID = 'edit-employee-form'

export const NO_MANAGER_OPTION = 'No line manager'

interface EditEmployeeModalProps {
  employee: UserListItem
  employees: UserListItem[]
  onClose: () => void
  onSaved: () => void
}

function namedOptions(rows: { id: number; name: string }[]): SelectOption[] {
  return rows.map((row) => ({ value: String(row.id), label: row.name }))
}

export default function EditEmployeeModal({
  employee,
  employees,
  onClose,
  onSaved,
}: EditEmployeeModalProps) {
  const [draft, setDraft] = useState<EmployeeDraft | null>(null)
  const [departments, setDepartments] = useState<DepartmentRow[]>([])
  const [jobRoles, setJobRoles] = useState<JobRoleRow[]>([])
  const [loadError, setLoadError] = useState<unknown>(null)
  const [errors, setErrors] = useState<EmployeeErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const name = fullName(employee)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      apiFetch<ApiSuccess<UserRecord>>(userPath(employee.id)),
      cachedGet<ApiSuccess<DepartmentRow[]>>('/api/departments'),
      cachedGet<ApiSuccess<JobRoleRow[]>>('/api/job-roles'),
    ])
      .then(([record, departmentList, jobRoleList]) => {
        if (cancelled) return
        setDepartments(departmentList.data)
        setJobRoles(jobRoleList.data)
        setDraft(draftFromRecord(record.data))
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error)
      })

    return () => {
      cancelled = true
    }
  }, [employee.id, attempt])

  function update(patch: Partial<EmployeeDraft>): void {
    setDraft((current) =>
      current === null ? current : { ...current, ...patch }
    )
    setErrors({})
    setSubmitError(null)
  }

  function retry(): void {
    setLoadError(null)
    setAttempt((value) => value + 1)
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (draft === null) return

    const found = validateEmployee(draft, employee.id)
    setErrors(found)
    if (hasEmployeeErrors(found)) return

    setSubmitError(null)
    setSubmitting(true)
    try {
      await updateEmployee(employee.id, draft)
      onSaved()
      onClose()
    } catch (error) {
      setSubmitError(
        getApiErrorMessage(error, `Could not save changes to ${name}`)
      )
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={`Edit ${name}`}
      onClose={onClose}
      description="Change only what needs to change. Everything else is already filled in."
      primary={
        loadError || draft === null
          ? undefined
          : {
              label: submitting ? 'Saving…' : 'Save changes',
              disabled: submitting,
              form: FORM_ID,
            }
      }
      secondary={{ label: 'Cancel', disabled: submitting }}
    >
      {loadError ? (
        <ErrorState
          error={loadError}
          onRetry={retry}
          fallbackMessage={`Could not load ${name}'s record`}
        />
      ) : draft === null ? (
        <LoadingState label={`Loading ${name}'s record`} />
      ) : (
        <form
          id={FORM_ID}
          onSubmit={handleSubmit}
          data-testid="edit-employee-form"
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
              options={namedOptions(departments)}
              placeholder="Select a department"
              error={errors.departmentId}
            />
            <SelectWithLabel
              id="employee-job-role"
              label="Job role"
              value={draft.jobRoleId}
              onChange={(jobRoleId) => update({ jobRoleId })}
              options={namedOptions(jobRoles)}
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
                employees
                  .filter((candidate) => candidate.id !== employee.id)
                  .map((candidate) => ({
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
            label="New password"
            type="password"
            value={draft.password}
            onChange={(password) => update({ password })}
            autoComplete="new-password"
            placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
            hint={KEEP_PASSWORD_HINT}
            error={errors.password}
          />

          {submitError && <FormAlert message={submitError} />}
        </form>
      )}
    </Modal>
  )
}
