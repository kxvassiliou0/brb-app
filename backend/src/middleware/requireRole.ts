import { RoleType } from "@enums";
import type { NextFunction, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Logger } from "../helpers/Logger.ts";
import { ResponseHandler } from "../helpers/ResponseHandler.ts";
import type { AuthenticatedJWTRequest as Request } from "../interfaces/AuthenticatedJWTRequest.interface.ts";

export function requireRole(
  ...roles: Array<RoleType>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const signedInUser = req.signedInUser;

    if (!signedInUser?.token?.role) {
      Logger.warn("Unauthorised access attempt", {
        email: signedInUser?.token?.email,
        role: signedInUser?.token?.role,
        requiredRoles: roles,
        route: req.originalUrl,
        method: req.method,
      });
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.FORBIDDEN,
        "Access denied",
      );
      return;
    }

    if (!roles.includes(signedInUser.token.role as RoleType)) {
      Logger.warn("Unauthorised access attempt", {
        email: signedInUser?.token?.email,
        role: signedInUser?.token?.role,
        requiredRoles: roles,
        route: req.originalUrl,
        method: req.method,
      });
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.FORBIDDEN,
        `Access denied - requires one of: ${roles.join(", ")}`,
      );
      return;
    }

    next();
  };
}
