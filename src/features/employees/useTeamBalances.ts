import { useCallback } from 'react'
import { listCalendar, listPendingForManager } from '@/api/leaveRequests'
import { useResource, type Resource } from '@/api/useResource'
import { getLeaveYear } from '@/lib/leaveYear'
import {
  directReports,
  fetchTeamBalances,
  type TeamBalance,
} from '@/features/employees/teamBalances'

interface TeamBalancesResource {
  rows: TeamBalance[] | null
  error: unknown
  retry: () => void
}

export function useTeamBalances(
  managerId: number | undefined
): TeamBalancesResource {
  const load = useCallback(async (): Promise<TeamBalance[]> => {
    if (managerId === undefined) return []

    const { start, end } = getLeaveYear()
    const [queue, calendar] = await Promise.allSettled([
      listPendingForManager(managerId),
      listCalendar(start, end),
    ])

    if (queue.status === 'rejected' && calendar.status === 'rejected') {
      throw queue.reason
    }

    return fetchTeamBalances(
      directReports(
        queue.status === 'fulfilled' ? queue.value : [],
        calendar.status === 'fulfilled' ? calendar.value : [],
        managerId
      )
    )
  }, [managerId])

  const { data, error, retry }: Resource<TeamBalance[]> = useResource(
    managerId === undefined ? null : load,
    [load]
  )

  return { rows: data, error, retry }
}
