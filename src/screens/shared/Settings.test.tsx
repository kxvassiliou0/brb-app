import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setStoredToken } from '@/api/token'
import { AuthProvider } from '@/features/auth/auth'
import { routes } from '@/routes'
import { makeUserJwt } from '@/test-support/jwt'
import type { RemainingLeave, UserProfile } from '@/types/api'

const USER_ID = 4

const PROFILE_FIELD_COUNT = 6

const EMAIL = 'david.jones@company.com'

const PROFILE: UserProfile = {
  id: USER_ID,
  firstName: 'David',
  lastName: 'Jones',
  email: EMAIL,
  role: 'Employee',
  annualLeaveAllowance: 25,
  department: { id: 2, name: 'Engineering' },
  jobRole: { id: 3, name: 'Software Engineer' },
}

const BALANCE: RemainingLeave = {
  annual_allowance: 25,
  days_used: 7,
  days_remaining: 18,
}

interface StubResponse {
  ok: boolean
  status: number
  body: unknown
}

function ok(data: unknown): StubResponse {
  return { ok: true, status: 200, body: { data } }
}

function fail(status: number, error: string): StubResponse {
  return { ok: false, status, body: { error } }
}

interface Options {
  profile?: StubResponse
  balance?: StubResponse
}

let fetchMock: ReturnType<typeof vi.fn>

function stubApi(options: Options = {}): void {
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    let response: StubResponse

    if (url.includes('/api/users/me')) response = options.profile ?? ok(PROFILE)
    else if (url.includes('/api/leave-requests/remaining'))
      response = options.balance ?? ok(BALANCE)
    else response = ok([])

    return {
      ok: response.ok,
      status: response.status,
      json: async () => response.body,
    } as unknown as Response
  })

  vi.stubGlobal('fetch', fetchMock)
}

function renderSettings(): void {
  setStoredToken(makeUserJwt({ id: USER_ID, email: EMAIL, role: 'Employee' }))
  const router = createMemoryRouter(routes, { initialEntries: ['/settings'] })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

async function loadedProfile(): Promise<HTMLElement> {
  const section = await screen.findByTestId('profile-section')
  await waitFor(() => expect(section).toHaveTextContent('David Jones'))
  return section
}

function writeMethods(): string[] {
  return fetchMock.mock.calls
    .map(([, init]) => (init as RequestInit | undefined)?.method ?? 'GET')
    .filter((method) => method !== 'GET')
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('settings profile details', () => {
  it('renders every profile field from the value the endpoint returned', async () => {
    stubApi()
    renderSettings()
    await loadedProfile()

    const pairs: [string, string][] = [
      ['Full name', 'David Jones'],
      ['Email address', EMAIL],
      ['Role', 'Employee'],
      ['Department', 'Engineering'],
      ['Job role', 'Software Engineer'],
      ['Annual leave allowance', '25 days'],
    ]

    pairs.forEach(([label, value]) => {
      expect(screen.getByLabelText(label)).toHaveValue(value)
    })
  })

  it('names the signed-in person above the fields', async () => {
    stubApi()
    renderSettings()
    await loadedProfile()

    expect(screen.getByTestId('profile-display-name')).toHaveTextContent(
      'David Jones'
    )
    expect(screen.getByTestId('profile-avatar')).toHaveTextContent('DJ')
  })

  it('falls back to a dash rather than blanks when a relation is missing', async () => {
    stubApi({
      profile: ok({ ...PROFILE, department: null, jobRole: null }),
    })
    renderSettings()
    await loadedProfile()

    expect(screen.getByLabelText('Department')).toHaveValue('—')
    expect(screen.getByLabelText('Job role')).toHaveValue('—')
  })
})

describe('settings profile is read-only', () => {
  it('marks every profile field read-only and keeps its value when typed into', async () => {
    stubApi()
    renderSettings()
    const section = await loadedProfile()

    const fields = Array.from(section.querySelectorAll('input'))
    expect(fields).toHaveLength(PROFILE_FIELD_COUNT)

    fields.forEach((field) => {
      expect(field).toHaveAttribute('readonly')
      expect(field).toHaveAttribute('aria-readonly', 'true')
      fireEvent.change(field, { target: { value: 'Someone Else' } })
    })

    expect(screen.getByLabelText('Full name')).toHaveValue('David Jones')
    expect(screen.getByLabelText('Email address')).toHaveValue(EMAIL)
  })

  it('refuses the click that would put a caret in a field', async () => {
    stubApi()
    renderSettings()
    await loadedProfile()

    const field = screen.getByLabelText('Full name')
    const mouseDown = fireEvent.mouseDown(field)

    expect(mouseDown).toBe(false)
    expect(field.className).toContain('cursor-not-allowed')
  })

  it('offers no control that could submit a change to the profile', async () => {
    stubApi()
    renderSettings()
    const section = await loadedProfile()

    expect(section.querySelectorAll('select, textarea, button')).toHaveLength(0)
    expect(section).toHaveTextContent(/held by your administrator/i)
    expect(writeMethods()).toEqual([])
  })
})

describe('settings leave allowance', () => {
  it('renders the three figures from the balance endpoint', async () => {
    stubApi()
    renderSettings()

    const section = await screen.findByTestId('leave-allowance-section')
    await waitFor(() => expect(section).toHaveTextContent('18 days'))

    expect(section).toHaveTextContent('Annual allowance')
    expect(section).toHaveTextContent('25 days')
    expect(section).toHaveTextContent('Taken so far')
    expect(section).toHaveTextContent('7 days')
    expect(section).toHaveTextContent('Remaining')
  })
})

describe('settings failure states', () => {
  it('reports a failed profile load without breaking the rest of the screen', async () => {
    stubApi({ profile: fail(500, 'Service unavailable') })
    renderSettings()

    const section = await screen.findByTestId('profile-section')
    await waitFor(() =>
      expect(section).toHaveTextContent('Service unavailable')
    )
    expect(
      await screen.findByTestId('leave-allowance-section')
    ).toHaveTextContent('Leave allowance')
  })

  it('reports a failed balance load without hiding the profile', async () => {
    stubApi({ balance: fail(500, 'Service unavailable') })
    renderSettings()

    await loadedProfile()
    await waitFor(() =>
      expect(screen.getByTestId('leave-allowance-section')).toHaveTextContent(
        'Service unavailable'
      )
    )
    expect(screen.getByLabelText('Email address')).toHaveValue(EMAIL)
  })
})
