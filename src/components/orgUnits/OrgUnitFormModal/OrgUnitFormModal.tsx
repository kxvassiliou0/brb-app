import { useState, type FormEvent } from 'react'
import FormAlert from '@/components/ui/FormAlert'
import InputWithLabel from '@/components/ui/InputWithLabel'
import Modal from '@/components/ui/Modal'
import { getApiErrorMessage } from '@/lib/api'
import {
  createOrgUnit,
  updateOrgUnit,
  validateOrgUnitName,
  type OrgUnit,
  type OrgUnitKind,
} from '@/lib/orgUnits'

interface OrgUnitFormModalProps {
  kind: OrgUnitKind
  units: OrgUnit[]
  unit?: OrgUnit
  onClose: () => void
  onSaved: () => void
}

export function orgUnitFormId(kind: OrgUnitKind): string {
  return `${kind.key}-form`
}

export function orgUnitNameFieldId(kind: OrgUnitKind): string {
  return `${kind.key}-name`
}

export default function OrgUnitFormModal({
  kind,
  units,
  unit,
  onClose,
  onSaved,
}: OrgUnitFormModalProps) {
  const [name, setName] = useState(unit?.name ?? '')
  const [error, setError] = useState<string | undefined>(undefined)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const editing = unit !== undefined
  const formId = orgUnitFormId(kind)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()

    const found = validateOrgUnitName(kind, name, units, unit?.id)
    setError(found)
    if (found) return

    setSubmitError(null)
    setSubmitting(true)
    try {
      if (editing) await updateOrgUnit(kind, unit.id, name)
      else await createOrgUnit(kind, name)
      onSaved()
      onClose()
    } catch (err) {
      setSubmitError(
        getApiErrorMessage(
          err,
          editing
            ? `Could not rename ${unit.name}`
            : `Could not add this ${kind.noun}`
        )
      )
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={editing ? `Rename ${unit.name}` : kind.addLabel}
      onClose={onClose}
      description={
        editing
          ? `Everyone already in this ${kind.noun} keeps it under its new name.`
          : `It becomes available to pick the moment you save it.`
      }
      primary={{
        label: submitting
          ? 'Saving…'
          : editing
            ? 'Save changes'
            : kind.addLabel,
        disabled: submitting,
        form: formId,
      }}
      secondary={{ label: 'Cancel', disabled: submitting }}
    >
      <form
        id={formId}
        onSubmit={handleSubmit}
        data-testid={formId}
        className="flex flex-col gap-5"
      >
        <InputWithLabel
          id={orgUnitNameFieldId(kind)}
          label={kind.nameLabel}
          value={name}
          onChange={(value) => {
            setName(value)
            setError(undefined)
            setSubmitError(null)
          }}
          placeholder={`At most ${kind.nameMaxLength} characters`}
          error={error}
        />

        {submitError && <FormAlert message={submitError} />}
      </form>
    </Modal>
  )
}
