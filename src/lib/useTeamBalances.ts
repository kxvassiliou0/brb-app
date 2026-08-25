import { useCallback, useEffect, useState } from 'react'
import { cachedGet } from '@/lib/apiCache'
import { getLeaveYear } from '@/lib/leaveYear'
import {
  directReports,
  fetchTeamBalances,
  type TeamBalance,
} from '@/lib/teamBalances'
import type { ApiSuccess, CalendarEntry, LeaveRequest } from '@/types/api'

export interface TeamBalancesResource {
  rows: TeamBalance[] | null
  error: unknown
  retry: () => void
}

export function useTeamBalances(
  managerId: number | undefined
): TeamBalancesResource {
  const [rows, setRows] = useState<TeamBalance[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setRows(null)
    setError(null)
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    if (managerId === undefined) return
    let cancelled = false
    const force = attempt > 0
    const { start, end } = getLeaveYear()

    Promise.allSettled([
      cachedGet<ApiSuccess<LeaveRequest[]>>(
        `/api/leave-requests/pending/manager/${managerId}`,
        force
      ),
      cachedGet<ApiSuccess<CalendarEntry[]>>(
        `/api/leave-requests/calendar?from=${start}&to=${end}`,
        force
      ),
    ])
      .then(async ([queue, calendar]) => {
        if (cancelled) return
        if (queue.status === 'rejected' && calendar.status === 'rejected') {
          setError(queue.reason)
          return
        }

        const members = directReports(
          queue.status === 'fulfilled' ? queue.value.data : [],
          calendar.status === 'fulfilled' ? calendar.value.data : [],
          managerId
        )

        const balances = await fetchTeamBalances(members, force)
        if (!cancelled) setRows(balances)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err)
      })

    return () => {
      cancelled = true
    }
  }, [managerId, attempt])

  return { rows, error, retry }
}
