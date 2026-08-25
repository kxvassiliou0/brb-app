import { useState } from 'react'
import Button from '@/components/Button'
import FormAlert from '@/components/FormAlert'
import Modal from '@/components/Modal'
import { getApiErrorMessage } from '@/lib/api'
import {
  DELETE_ACKNOWLEDGEMENT,
  deleteEmployee,
  deletionConsequences,
  fullName,
} from '@/lib/employeeAdmin'
import type { UserListItem } from '@/types/api'

interface DeleteEmployeeModalProps {
  employee: UserListItem
  employees: UserListItem[]
  onClose: () => void
  onDeleted: () => void
}

export default function DeleteEmployeeModal({
  employee,
  employees,
  onClose,
  onDeleted,
}: DeleteEmployeeModalProps) {
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const name = fullName(employee)
  const consequences = deletionConsequences(employee, employees)

  async function confirm(): Promise<void> {
    if (!accepted) return

    setError(null)
    setSubmitting(true)
    try {
      await deleteEmployee(employee.id)
      onDeleted()
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, `Could not delete ${name}`))
      setSubmitting(false)
    }
  }

  return (
    <Modal label={`Delete ${name}`} onClose={onClose}>
      <div data-testid="delete-confirmation" className="flex flex-col gap-1">
        <h2 className="text-2xl md:text-3xl">Delete {name}?</h2>
        <p className="text-sm text-text-secondary">
          Removing {name} from {employee.department.name} changes more than this
          one record:
        </p>
      </div>

      <ul className="flex flex-col gap-2 rounded-lg bg-error-background px-4 py-3 text-sm text-error-foreground">
        {consequences.map((consequence) => (
          <li key={consequence}>{consequence}</li>
        ))}
      </ul>

      <div className="flex items-start gap-3">
        <input
          id="delete-acknowledgement"
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="touch-target"
        />
        <label htmlFor="delete-acknowledgement" className="text-text-primary">
          {DELETE_ACKNOWLEDGEMENT}
        </label>
      </div>

      {error && <FormAlert message={error} />}

      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
        <Button
          variant="danger"
          disabled={!accepted || submitting}
          onClick={confirm}
        >
          {submitting ? 'Deleting…' : `Delete ${name}`}
        </Button>
        <Button variant="secondary" disabled={submitting} onClick={onClose}>
          Keep {name}
        </Button>
      </div>
    </Modal>
  )
}
