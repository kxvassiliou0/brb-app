import { useEffect, useRef, type ReactNode } from 'react'
import Button, { type ButtonVariant } from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'

export interface ModalAction {
  label: ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  disabled?: boolean
  form?: string
}

interface ModalProps {
  title: string
  onClose: () => void
  label?: string
  description?: ReactNode
  leading?: ReactNode
  primary?: ModalAction
  secondary?: ModalAction
  children: ReactNode
}

export default function Modal({
  title,
  onClose,
  label,
  description,
  leading,
  primary,
  secondary,
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    return () => previous?.focus?.()
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const targets = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === panel)
      if (targets.length === 0) return
      const first = targets[0]!
      const last = targets[targets.length - 1]!
      const active = document.activeElement
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [onClose])

  return (
    <div
      data-testid="modal-overlay"
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-text-primary/40 p-0 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label ?? title}
        tabIndex={-1}
        data-testid="modal"
        className="flex w-full max-w-xl flex-col gap-5 rounded-t-2xl bg-background-secondary p-4 shadow-xl shadow-black/20 outline-none sm:my-auto sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          {leading}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="truncate text-2xl md:text-3xl">{title}</h2>
            {description && (
              <p className="text-sm text-text-secondary">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="modal-close"
            className="touch-target -mt-1 -mr-1 inline-flex shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-background-tertiary hover:text-text-primary"
          >
            <Icon name="cross" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {children}

        {(primary || secondary) && (
          <div className="flex flex-col gap-3 border-t border-border-primary pt-5 sm:flex-row-reverse sm:justify-start">
            {primary && (
              <Button
                type={primary.form ? 'submit' : 'button'}
                form={primary.form}
                testId="modal-primary"
                variant={primary.variant}
                disabled={primary.disabled}
                onClick={primary.onClick}
              >
                {primary.label}
              </Button>
            )}
            {secondary && (
              <Button
                variant={secondary.variant ?? 'secondary'}
                testId="modal-secondary"
                disabled={secondary.disabled}
                onClick={secondary.onClick ?? onClose}
              >
                {secondary.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
