import { RoleType } from "@enums";
import { Router } from "express";
import { MiddlewareFactory } from "../helpers/MiddlewareFactory.ts";
import { requireRole } from "../middleware/requireRole.ts";
import type { IEntityController } from "../types/IEntityController.ts";
import type { IRouter } from "../types/IRouter.ts";

export class JobRoleRouter implements IRouter {
  public readonly authenticate = true;
  public readonly routeName = "job-roles";
  public readonly limiter = MiddlewareFactory.jwtRateLimiter;
  public readonly basePath = "/api/job-roles";

  constructor(
    private readonly router: Router,
    private readonly jobRoleController: IEntityController,
  ) {
    this.addRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private addRoutes(): void {
    this.router.get("/", this.jobRoleController.getAll);
    this.router.get("/:id", this.jobRoleController.getById);

    this.router.post(
      "/",
      requireRole(RoleType.Admin),
      this.jobRoleController.create,
    );
    this.router.patch(
      "/:id",
      requireRole(RoleType.Admin),
      this.jobRoleController.update,
    );
    this.router.delete(
      "/:id",
      requireRole(RoleType.Admin),
      this.jobRoleController.delete,
    );
  }
}
