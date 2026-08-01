import { RoleType } from "@enums";

export class UserDTOToken {
  constructor(
    public readonly id: number,
    public readonly email: string,
    public readonly role: RoleType,
  ) {}
}
