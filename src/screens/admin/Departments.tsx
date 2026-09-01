import { useResource } from '@/api/useResource'
import OrgUnitSection from '@/components/orgUnits/OrgUnitSection'
import { DEPARTMENT, JOB_ROLE } from '@/features/orgUnits/orgUnits'

export default function Departments() {
  const departments = useResource(DEPARTMENT.operations.list)
  const jobRoles = useResource(JOB_ROLE.operations.list)

  return (
    <div data-testid="screen-departments" className="flex flex-col gap-12">
      <OrgUnitSection
        kind={DEPARTMENT}
        units={departments.data}
        error={departments.error}
        onRetry={departments.retry}
        onChanged={departments.retry}
        heading={<h1 className="text-2xl md:text-3xl">Departments</h1>}
      />

      <OrgUnitSection
        kind={JOB_ROLE}
        units={jobRoles.data}
        error={jobRoles.error}
        onRetry={jobRoles.retry}
        onChanged={jobRoles.retry}
        heading={<h2 className="text-2xl md:text-3xl">Job roles</h2>}
      />
    </div>
  )
}
