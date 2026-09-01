import { useCallback, useState, type FormEvent } from 'react'
import { getApiErrorMessage } from '@/api/client'
import { listDepartments, listJobRoles } from '@/api/orgUnits'
import { getUser } from '@/api/users'
import { useResource } from '@/api/useResource'
import FormAlert from '@/components/ui/FormAlert'
import InputWithLabel, {
  SelectWithLabel,
  type SelectOption,
} from '@/components/ui/InputWithLabel'
import Modal from '@/components/ui/Modal'
import { ErrorState, LoadingState } from '@/components/ui/states'
import {
  createEmployee,
  draftFromRecord,
  DUPLICATE_EMAIL_MESSAGE,
  emptyEmployeeDraft,
  fullName,
  hasEmployeeErrors,
  isDuplicateEmailError,
  KEEP_PASSWORD_HINT,
  PASSWORD_MIN_LENGTH,
  ROLES,
  updateEmployee,
  validateEmployee,
  validateNewEmployee,
  type EmployeeDraft,
  type EmployeeErrors,
} from '@/features/employees/employeeAdmin'
import type { DepartmentRow, JobRoleRow, UserListItem } from '@/types/api'

export const ADD_EMPLOYEE_LABEL = 'Add an employee'

interface EmployeeFormModalProps {
  employees: UserListItem[]
  employee?: UserListItem
  onClose: () => void
  onSaved: () => void
}

interface Choices {
  departments: DepartmentRow[]
  jobRoles: JobRoleRow[]
  draft: EmployeeDraft
}

function namedOptions(rows: { id: number; name: string }[]): SelectOption[] {
  return rows.map((row) => ({ value: String(row.id), label: row.name }))
}

export default function EmployeeFormModal({
  employees,
  employee,
  onClose,
  onSaved,
}: EmployeeFormModalProps) {
  const editing = employee !== undefined
  const employeeId = employee?.id
  const name = employee ? fullName(employee) : ''
  const formId = editing ? 'edit-employee-form' : 'add-employee-form'

  const load = useCallback(async (): Promise<Choices> => {
    const [departments, jobRoles, record] = await Promise.all([
      listDepartments(),
      listJobRoles(),
      employeeId === undefined ? null : getUser(employeeId),
    ])
    return {
      departments,
      jobRoles,
      draft: record ? draftFromRecord(record) : emptyEmployeeDraft(),
    }
  }, [employeeId])

  const { data: choices, error: loadError, retry } = useResource(load, [load])

  const [edits, setEdits] = useState<Partial<EmployeeDraft>>({})
  const [errors, setErrors] = useState<EmployeeErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const draft: EmployeeDraft | null = choices
    ? { ...choices.draft, ...edits }
    : null

  function update(patch: Partial<EmployeeDraft>): void {
    setEdits((current) => ({ ...current, ...patch }))
    setErrors({})
    setSubmitError(null)
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (draft === null) return

    const found = editing
      ? validateEmployee(draft, employeeId)
      : validateNewEmployee(draft)
    setErrors(found)
    if (hasEmployeeErrors(found)) return

    setSubmitError(null)
    setSubmitting(true)
    try {
      if (editing && employeeId !== undefined) {
        await updateEmployee(employeeId, draft)
      } else {
        await createEmployee(draft)
      }
      onSaved()
      onClose()
    } catch (error) {
      if (isDuplicateEmailError(error)) {
        setErrors({ email: DUPLICATE_EMAIL_MESSAGE })
      } else {
        setSubmitError(
          getApiErrorMessage(
            error,
            editing
              ? `Could not save changes to ${name}`
              : 'Could not add this employee'
          )
        )
      }
      setSubmitting(false)
    }
  }

  const managerCandidates = employees.filter(
    (candidate) => candidate.id !== employeeId
  )

  return (
    <Modal
      title={editing ? `Edit ${name}` : ADD_EMPLOYEE_LABEL}
      onClose={onClose}
      description={
        editing
          ? 'Change only what needs to change. Everything else is already filled in.'
          : 'They can sign in and book leave as soon as you save them.'
      }
      primary={
        loadError || draft === null
          ? undefined
          : {
              label: submitting
                ? editing
                  ? 'Saving…'
                  : 'Adding…'
                : editing
                  ? 'Save changes'
                  : 'Add employee',
              disabled: submitting,
              form: formId,
            }
      }
      secondary={{ label: 'Cancel', disabled: submitting }}
    >
      {loadError ? (
        <ErrorState
          error={loadError}
          onRetry={retry}
          fallbackMessage={
            editing
              ? `Could not load ${name}'s record`
              : 'Could not load departments and job roles'
          }
        />
      ) : choices === null || draft === null ? (
        <LoadingState
          label={
            editing
              ? `Loading ${name}'s record`
              : 'Loading departments and job roles'
          }
        />
      ) : (
        <form
          id={formId}
          onSubmit={handleSubmit}
          data-testid={formId}
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
                managerCandidates.map((candidate) => ({
                  id: candidate.id,
                  name: fullName(candidate),
                }))
              )}
              placeholder="No line manager"
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
            label={editing ? 'New password' : 'Password'}
            type="password"
            value={draft.password}
            onChange={(password) => update({ password })}
            autoComplete="new-password"
            placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
            hint={
              editing
                ? KEEP_PASSWORD_HINT
                : 'They will use this to sign in for the first time.'
            }
            error={errors.password}
          />

          {submitError && <FormAlert message={submitError} />}
        </form>
      )}
    </Modal>
  )
}
