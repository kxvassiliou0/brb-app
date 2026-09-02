import { useState, type FormEvent } from 'react'
import Button from '@/components/ui/Button'
import FormAlert from '@/components/ui/FormAlert'
import Icon from '@/components/ui/Icon'
import InputWithLabel from '@/components/ui/InputWithLabel'
import Modal from '@/components/ui/Modal'
import {
  removeHoliday,
  saveHoliday,
  validateHoliday,
  type PublicHoliday,
} from '@/features/calendar/publicHolidays'
import { formatDateFull } from '@/lib/dates'

interface PublicHolidayFormModalProps {
  holiday: PublicHoliday
  onClose: () => void
  onChanged: () => void
}

export default function PublicHolidayFormModal({
  holiday,
  onClose,
  onChanged,
}: PublicHolidayFormModalProps) {
  const [name, setName] = useState(holiday.name)
  const [nameError, setNameError] = useState<string | undefined>(undefined)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function run(action: Promise<unknown>, failure: string): Promise<void> {
    setSubmitError(null)
    setSubmitting(true)
    try {
      await action
      onChanged()
      onClose()
    } catch {
      setSubmitError(failure)
      setSubmitting(false)
    }
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const found = validateHoliday(name, holiday.date, [], holiday.id)
    setNameError(found.name)
    if (found.name) return
    await run(
      saveHoliday(name, holiday.date, holiday),
      `Could not save changes to ${holiday.name}. Please try again.`
    )
  }

  return (
    <Modal
      title={holiday.name}
      onClose={onClose}
      description={
        confirming
          ? `${formatDateFull(holiday.date)} becomes bookable as leave again.`
          : `${formatDateFull(holiday.date)} is a public holiday, so nobody can book it as leave.`
      }
      primary={
        confirming
          ? {
              label: submitting ? 'Deleting…' : `Delete ${holiday.name}`,
              variant: 'danger',
              disabled: submitting,
              onClick: () =>
                run(
                  removeHoliday(holiday),
                  `Could not delete ${holiday.name}. Please try again.`
                ),
            }
          : {
              label: submitting ? 'Saving…' : 'Save changes',
              disabled: submitting,
              form: 'public-holiday-form',
            }
      }
      secondary={{
        label: confirming ? `Keep ${holiday.name}` : 'Cancel',
        disabled: submitting,
        ...(confirming ? { onClick: () => setConfirming(false) } : {}),
      }}
    >
      <form
        id="public-holiday-form"
        onSubmit={handleSubmit}
        data-testid="public-holiday-form"
        className="flex flex-col gap-5"
      >
        {!confirming && (
          <InputWithLabel
            id="holiday-name"
            label="Holiday name"
            value={name}
            onChange={(value) => {
              setName(value)
              setNameError(undefined)
              setSubmitError(null)
            }}
            error={nameError}
          />
        )}

        {submitError && <FormAlert message={submitError} />}

        {!confirming && (
          <div className="flex border-t border-border-primary pt-5">
            <Button
              variant="ghostDanger"
              disabled={submitting}
              onClick={() => setConfirming(true)}
            >
              <Icon name="trash" />
              Delete {holiday.name}
            </Button>
          </div>
        )}
      </form>
    </Modal>
  )
}
