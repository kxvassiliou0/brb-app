type FormAlertVariant = 'error' | 'warning'

const VARIANT: Record<FormAlertVariant, string> = {
  error: 'bg-error-background text-error-foreground',
  warning: 'bg-pending-background text-pending-foreground',
}

interface FormAlertProps {
  message: string
  variant?: FormAlertVariant
}

export default function FormAlert({
  message,
  variant = 'error',
}: FormAlertProps) {
  return (
    <p
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-lg px-4 py-3 text-sm ${VARIANT[variant]}`}
    >
      {message}
    </p>
  )
}
