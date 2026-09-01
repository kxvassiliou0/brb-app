import { departments, jobRoles, type OrgUnitOperations } from '@/api/orgUnits'
import type { DepartmentRow } from '@/types/api'

export type OrgUnit = DepartmentRow

export interface OrgUnitKind {
  key: 'department' | 'jobRole'
  noun: string
  nounPlural: string
  nameMaxLength: number
  addLabel: string
  nameLabel: string
  operations: OrgUnitOperations<OrgUnit>
}

export const DEPARTMENT: OrgUnitKind = {
  key: 'department',
  noun: 'department',
  nounPlural: 'departments',
  nameMaxLength: 100,
  addLabel: 'Add a department',
  nameLabel: 'Department name',
  operations: departments,
}

export const JOB_ROLE: OrgUnitKind = {
  key: 'jobRole',
  noun: 'job role',
  nounPlural: 'job roles',
  nameMaxLength: 30,
  addLabel: 'Add a job role',
  nameLabel: 'Job role name',
  operations: jobRoles,
}

export function peopleNoun(count: number): string {
  return count === 1 ? 'person' : 'people'
}

export function peopleLabel(count: number): string {
  return `${count} ${peopleNoun(count)}`
}

export function isInUse(unit: OrgUnit): boolean {
  return unit.userCount > 0
}

export function inUseMessage(kind: OrgUnitKind, unit: OrgUnit): string {
  const holders = unit.userCount === 1 ? 'is' : 'are'
  const placement = kind.key === 'department' ? 'in' : 'assigned to'
  return `${peopleLabel(unit.userCount)} ${holders} ${placement} ${unit.name}, so it cannot be deleted. Move them to another ${kind.noun} first.`
}

export function validateOrgUnitName(
  kind: OrgUnitKind,
  name: string,
  units: OrgUnit[],
  unitId?: number
): string | undefined {
  const trimmed = name.trim()
  if (!trimmed) return `Please enter a ${kind.noun} name`
  if (trimmed.length > kind.nameMaxLength)
    return `Name must be ${kind.nameMaxLength} characters or less`

  const taken = units.some(
    (unit) =>
      unit.id !== unitId &&
      unit.name.trim().toLowerCase() === trimmed.toLowerCase()
  )
  if (taken) return `That ${kind.noun} already exists`

  return undefined
}

export function createOrgUnit(kind: OrgUnitKind, name: string): Promise<void> {
  return kind.operations.create(name.trim())
}

export function updateOrgUnit(
  kind: OrgUnitKind,
  id: number,
  name: string
): Promise<void> {
  return kind.operations.rename(id, name.trim())
}

export function deleteOrgUnit(kind: OrgUnitKind, id: number): Promise<void> {
  return kind.operations.remove(id)
}

export function describeOrgUnits(
  kind: OrgUnitKind,
  units: OrgUnit[] | null
): string {
  if (units === null) return ''
  const total = units.reduce((sum, unit) => sum + unit.userCount, 0)
  const noun = units.length === 1 ? kind.noun : kind.nounPlural
  return `${units.length} ${noun} • ${peopleLabel(total)}`
}
