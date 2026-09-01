import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate, type Location } from 'react-router'
import BrandHeader from '@/components/layout/BrandHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import InputWithLabel from '@/components/ui/InputWithLabel'
import { useAuth } from '@/features/auth/auth'
import { HOME_PATH } from '@/lib/routeAccess'
import { seasonalBackground } from '@/lib/seasonalBackground'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location } | null)?.from
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [background] = useState(seasonalBackground)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(from ? `${from.pathname}${from.search}` : HOME_PATH, {
        replace: true,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      data-testid="screen-login"
      className="relative flex min-h-svh flex-col items-center justify-center px-4 py-24 sm:px-6"
    >
      <img
        src={background}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div className="absolute top-6 left-4 sm:top-8 sm:left-8">
        <BrandHeader />
      </div>
      <div className="w-full max-w-md">
        <Card>
          <h1 className="text-2xl sm:text-3xl">Log in to Brb.</h1>
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            <InputWithLabel
              id="email"
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="example@mail.com"
              value={email}
              onChange={setEmail}
              required
            />
            <InputWithLabel
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              required
            />
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-error-background px-4 py-3 text-sm text-error-foreground"
              >
                {error}
              </p>
            )}
            <div className="mt-1">
              <Button type="submit" fullWidth disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
