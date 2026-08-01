import { RoleType } from "@enums";
import { Router } from "express";
import { MiddlewareFactory } from "../helpers/MiddlewareFactory.ts";
import { requireRole } from "../middleware/requireRole.ts";
import type { IEntityController } from "../types/IEntityController.ts";
import type { IRouter } from "../types/IRouter.ts";

export class DepartmentRouter implements IRouter {
  public readonly authenticate = true;
  public readonly routeName = "departments";
  public readonly limiter = MiddlewareFactory.jwtRateLimiter;
  public readonly basePath = "/api/departments";

  constructor(
    private readonly router: Router,
    private readonly departmentController: IEntityController,
  ) {
    this.addRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private addRoutes(): void {
    this.router.get("/", this.departmentController.getAll);
    this.router.get("/:id", this.departmentController.getById);

    this.router.post(
      "/",
      requireRole(RoleType.Admin),
      this.departmentController.create,
    );
    this.router.patch(
      "/:id",
      requireRole(RoleType.Admin),
      this.departmentController.update,
    );
    this.router.delete(
      "/:id",
      requireRole(RoleType.Admin),
      this.departmentController.delete,
    );
  }
}
