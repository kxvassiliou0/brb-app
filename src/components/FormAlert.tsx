export default function FormAlert({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg bg-error-background px-4 py-3 text-sm text-error-foreground"
    >
      {message}
    </p>
  )
}
