import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import { peopleNoun, type OrgUnit } from '@/features/orgUnits/orgUnits'

interface OrgUnitCardProps {
  unit: OrgUnit
  onEdit: (unit: OrgUnit) => void
  onDelete: (unit: OrgUnit) => void
}

export default function OrgUnitCard({
  unit,
  onEdit,
  onDelete,
}: OrgUnitCardProps) {
  return (
    <li
      data-testid="org-unit-card"
      className="flex flex-col gap-4 rounded-2xl border border-border-primary bg-background-secondary p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          data-testid="org-unit-name"
          className="min-w-0 wrap-anywhere text-2xl"
        >
          {unit.name}
        </h3>
        <div className="flex shrink-0 items-center">
          <Button variant="ghost" onClick={() => onEdit(unit)}>
            <Icon name="pencil" />
            <span className="sr-only">Rename {unit.name}</span>
          </Button>
          <Button variant="ghostDanger" onClick={() => onDelete(unit)}>
            <Icon name="trash" />
            <span className="sr-only">Delete {unit.name}</span>
          </Button>
        </div>
      </div>

      <div className="border-t border-border-primary pt-4">
        <p
          data-testid="org-unit-user-count"
          className="text-3xl text-text-primary"
        >
          {unit.userCount}
        </p>
        <p className="text-sm text-text-secondary">
          {peopleNoun(unit.userCount)}
        </p>
      </div>
    </li>
  )
}
