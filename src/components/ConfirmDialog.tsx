import type { ReactNode } from 'react'
import Button, { type ButtonVariant } from '@/components/Button'
import Modal from '@/components/Modal'

interface ConfirmDialogProps {
  title: string
  description: ReactNode
  details?: ReactNode
  consequence?: ReactNode
  confirmLabel: string
  cancelLabel: string
  confirmVariant?: ButtonVariant
  error?: string | null
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDialog({
  title,
  description,
  details,
  consequence,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'danger',
  error = null,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal label={title} onClose={onClose}>
      <div data-testid="confirm-dialog" className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl md:text-3xl">{title}</h2>
          <p className="text-sm text-text-secondary">{description}</p>
        </div>

        {details && (
          <div
            data-testid="confirm-dialog-details"
            className="rounded-xl border border-border-primary bg-background-tertiary px-4 py-3"
          >
            {details}
          </div>
        )}

        {consequence && (
          <p className="text-sm text-text-secondary">{consequence}</p>
        )}

        {error && (
          <p
            role="alert"
            data-testid="confirm-dialog-error"
            className="rounded-lg bg-error-background px-4 py-3 text-sm text-error-foreground"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 border-t border-border-primary pt-5 sm:flex-row-reverse sm:justify-start">
          <Button variant={confirmVariant} disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
