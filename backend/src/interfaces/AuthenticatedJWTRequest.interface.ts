import type { RoleType } from "@enums";
import type { Request } from "express";

export interface AuthenticatedJWTRequest extends Request {
  signedInUser?: {
    token?: {
      id?: number;
      email?: string;
      role?: RoleType;
    };
  };
}
