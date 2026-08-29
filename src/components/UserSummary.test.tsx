import { render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UserSummary from '@/components/UserSummary'
import { clearApiCache } from '@/lib/apiCache'
import type { AuthUser } from '@/lib/auth'
import type { UserProfile } from '@/types/api'

const USER: AuthUser = {
  id: 1,
  email: 'priya.sharma@company.com',
  role: 'Employee',
}

const PROFILE: UserProfile = {
  id: 1,
  firstName: 'Priya',
  lastName: 'Sharma',
  email: 'priya.sharma@company.com',
  role: 'Employee',
  annualLeaveAllowance: 25,
  department: { id: 1, name: 'Design' },
  jobRole: { id: 1, name: 'Contractor' },
}

function stubProfile(profile: UserProfile): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: profile }),
    }))
  )
}

function stubFailure(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Failed to retrieve user' }),
    }))
  )
}

function renderSummary(): void {
  render(<UserSummary user={USER} onSignOut={() => {}} />)
}

function name(): HTMLElement {
  return screen.getByTestId('user-summary-name')
}

beforeEach(() => {
  clearApiCache()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('user summary name', () => {
  it('shows the first and last name from the profile endpoint', async () => {
    stubProfile(PROFILE)
    renderSummary()

    await waitFor(() => expect(name()).toHaveTextContent('Priya Sharma'))
  })

  it('never shows the email address while the profile is loading', async () => {
    stubProfile(PROFILE)
    renderSummary()

    expect(name()).not.toHaveTextContent(USER.email)
    expect(within(name()).getByTestId('skeleton')).toBeInTheDocument()
    await waitFor(() => expect(name()).toHaveTextContent('Priya Sharma'))
  })

  it('builds the avatar initials from the name, not the email', async () => {
    stubProfile(PROFILE)
    renderSummary()

    await waitFor(() => expect(screen.getByText('PS')).toBeInTheDocument())
  })

  it('falls back to the email when the profile cannot be loaded', async () => {
    stubFailure()
    renderSummary()

    await waitFor(() => expect(name()).toHaveTextContent(USER.email))
  })
})
