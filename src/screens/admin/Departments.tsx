import OrgUnitSection from '@/components/orgUnits/OrgUnitSection'
import { DEPARTMENT, JOB_ROLE, type OrgUnit } from '@/lib/orgUnits'
import { useApiResource } from '@/lib/useApiResource'
import type { ApiSuccess } from '@/types/api'

export default function Departments() {
  const departments = useApiResource<ApiSuccess<OrgUnit[]>>(DEPARTMENT.apiPath)
  const jobRoles = useApiResource<ApiSuccess<OrgUnit[]>>(JOB_ROLE.apiPath)

  return (
    <div data-testid="screen-departments" className="flex flex-col gap-12">
      <OrgUnitSection
        kind={DEPARTMENT}
        units={departments.data?.data ?? null}
        error={departments.error}
        onRetry={departments.retry}
        onChanged={departments.retry}
        heading={<h1 className="text-2xl md:text-3xl">Departments</h1>}
      />

      <OrgUnitSection
        kind={JOB_ROLE}
        units={jobRoles.data?.data ?? null}
        error={jobRoles.error}
        onRetry={jobRoles.retry}
        onChanged={jobRoles.retry}
        heading={<h2 className="text-2xl md:text-3xl">Job roles</h2>}
      />
    </div>
  )
}
