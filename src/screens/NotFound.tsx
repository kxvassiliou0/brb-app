import LinkButton from '@/components/LinkButton'

export default function NotFound() {
  return (
    <div
      data-testid="not-found"
      className="flex flex-col items-start gap-4 px-4 py-10 sm:px-6"
    >
      <h1 className="text-2xl md:text-3xl">404 - Page not found</h1>
      <p className="text-text-secondary">
        The page you're looking for doesn't exist or has moved.
      </p>
      <LinkButton to="/login">Back to sign in</LinkButton>
    </div>
  )
}
