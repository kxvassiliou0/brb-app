import { RoleType } from "@enums";

export class UserDTORelation {
  constructor(
    public readonly id: number,
    public readonly name: string,
  ) {}
}

export class UserDTOProfile {
  constructor(
    public readonly id: number,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly email: string,
    public readonly role: RoleType,
    public readonly annualLeaveAllowance: number,
    public readonly department: UserDTORelation,
    public readonly jobRole: UserDTORelation,
  ) {}
}

export class UserDTOListItem {
  constructor(
    public readonly id: number,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly email: string,
    public readonly role: RoleType,
    public readonly annualLeaveAllowance: number,
    public readonly department: UserDTORelation,
    public readonly jobRole: UserDTORelation,
    public readonly manager: UserDTORelation | null,
  ) {}
}
