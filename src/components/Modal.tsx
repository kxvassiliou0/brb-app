import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ModalProps {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({
  title,
  description,
  onClose,
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()

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
        panel.querySelectorAll<HTMLElement>(FOCUSABLE)
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
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        data-testid="modal"
        className="my-auto flex w-full max-w-xl flex-col gap-5 rounded-t-2xl bg-background-secondary p-4 shadow-xl shadow-black/20 outline-none sm:rounded-2xl sm:p-6"
      >
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-2xl md:text-3xl">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="text-sm text-text-secondary">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
