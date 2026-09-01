import { useState } from 'react'
import FormAlert from '@/components/ui/FormAlert'
import Modal from '@/components/ui/Modal'
import { getApiErrorMessage } from '@/api/client'
import {
  deleteOrgUnit,
  inUseMessage,
  isInUse,
  type OrgUnit,
  type OrgUnitKind,
} from '@/features/orgUnits/orgUnits'

interface DeleteOrgUnitModalProps {
  kind: OrgUnitKind
  unit: OrgUnit
  onClose: () => void
  onDeleted: () => void
}

export default function DeleteOrgUnitModal({
  kind,
  unit,
  onClose,
  onDeleted,
}: DeleteOrgUnitModalProps) {
  const blocked = isInUse(unit)
  const [error, setError] = useState<string | null>(
    blocked ? inUseMessage(kind, unit) : null
  )
  const [submitting, setSubmitting] = useState(false)

  async function confirm(): Promise<void> {
    setError(null)
    setSubmitting(true)
    try {
      await deleteOrgUnit(kind, unit.id)
      onDeleted()
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, `Could not delete ${unit.name}`))
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={`Delete ${unit.name}?`}
      onClose={onClose}
      description={
        blocked
          ? `Every employee record must name a ${kind.noun}, so one that is still in use has to stay.`
          : `Nobody is in this ${kind.noun}, so nothing else changes.`
      }
      primary={
        blocked
          ? undefined
          : {
              label: submitting ? 'Deleting…' : `Delete ${unit.name}`,
              variant: 'danger',
              disabled: submitting,
              onClick: confirm,
            }
      }
      secondary={{
        label: blocked ? 'Close' : `Keep ${unit.name}`,
        disabled: submitting,
      }}
    >
      {error && <FormAlert message={error} />}
    </Modal>
  )
}
