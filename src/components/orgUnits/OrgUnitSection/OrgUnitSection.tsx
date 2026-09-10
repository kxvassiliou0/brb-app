import { useState, type ReactNode } from 'react'
import DeleteOrgUnitModal from '@/components/orgUnits/DeleteOrgUnitModal'
import OrgUnitCard from '@/components/orgUnits/OrgUnitCard'
import OrgUnitFormModal from '@/components/orgUnits/OrgUnitFormModal'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import { useResourceState } from '@/components/ui/states'
import {
  describeOrgUnits,
  type OrgUnit,
  type OrgUnitKind,
} from '@/features/orgUnits/orgUnits'

interface OrgUnitSectionProps {
  kind: OrgUnitKind
  units: OrgUnit[] | null
  error: unknown
  onRetry: () => void
  onChanged: () => void
  heading: ReactNode
}

export default function OrgUnitSection({
  kind,
  units,
  error,
  onRetry,
  onChanged,
  heading,
}: OrgUnitSectionProps) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<OrgUnit | null>(null)
  const [deleting, setDeleting] = useState<OrgUnit | null>(null)

  const addAction = (
    <Button onClick={() => setAdding(true)}>
      <Icon name="plus" />
      {kind.addLabel}
    </Button>
  )

  const state = useResourceState({
    data: units,
    error,
    onRetry,
    label: `Loading ${kind.nounPlural}`,
    fallbackMessage: `Failed to load ${kind.nounPlural}`,
    emptyMessage: `No ${kind.nounPlural} have been created yet.`,
    emptyAction: addAction,
  })

  return (
    <section data-testid={`${kind.key}-section`} aria-label={kind.nounPlural}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {heading}
          <p className="mt-1 text-text-secondary">
            {describeOrgUnits(kind, units)}
          </p>
        </div>
        <div className="shrink-0">{addAction}</div>
      </div>

      {state.ready ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.data.map((unit) => (
            <OrgUnitCard
              key={unit.id}
              unit={unit}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          ))}
        </ul>
      ) : (
        state.fallback
      )}

      {adding && (
        <OrgUnitFormModal
          kind={kind}
          units={units ?? []}
          onClose={() => setAdding(false)}
          onSaved={onChanged}
        />
      )}

      {editing && (
        <OrgUnitFormModal
          kind={kind}
          units={units ?? []}
          unit={editing}
          onClose={() => setEditing(null)}
          onSaved={onChanged}
        />
      )}

      {deleting && (
        <DeleteOrgUnitModal
          kind={kind}
          unit={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={onChanged}
        />
      )}
    </section>
  )
}
