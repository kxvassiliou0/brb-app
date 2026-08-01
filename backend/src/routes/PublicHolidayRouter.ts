import { RoleType } from "@enums";
import { Router } from "express";
import { MiddlewareFactory } from "../helpers/MiddlewareFactory.ts";
import { requireRole } from "../middleware/requireRole.ts";
import type { PublicHolidayController } from "../controllers/PublicHolidayController.ts";
import type { IRouter } from "../types/IRouter.ts";

export class PublicHolidayRouter implements IRouter {
  public readonly authenticate = true;
  public readonly routeName = "public-holidays";
  public readonly limiter = MiddlewareFactory.jwtRateLimiter;
  public readonly basePath = "/api/public-holidays";

  constructor(
    private readonly router: Router,
    private readonly controller: PublicHolidayController,
  ) {
    this.addRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private addRoutes(): void {
    this.router.get("/", this.controller.getAll);
    this.router.get("/:id", this.controller.getById);
    this.router.post("/", requireRole(RoleType.Admin), this.controller.create);
    this.router.patch(
      "/:id",
      requireRole(RoleType.Admin),
      this.controller.update,
    );
    this.router.delete(
      "/:id",
      requireRole(RoleType.Admin),
      this.controller.delete,
    );
  }
}
