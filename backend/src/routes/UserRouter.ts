import { RoleType } from "@enums";
import { Router } from "express";
import { UserController } from "../controllers/UserController.ts";
import { MiddlewareFactory } from "../helpers/MiddlewareFactory.ts";
import { requireRole } from "../middleware/requireRole.ts";
import type { IRouter } from "../types/IRouter.ts";

export class UserRouter implements IRouter {
  public readonly authenticate = true;
  public readonly routeName = "users";
  public readonly limiter = MiddlewareFactory.jwtRateLimiter;
  public readonly basePath = "/api/users";

  constructor(
    private readonly router: Router,
    private readonly userController: UserController,
  ) {
    this.addRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private addRoutes(): void {
    this.router.get(
      "/",
      requireRole(RoleType.Admin),
      this.userController.getAll,
    );
    this.router.get(
      "/:id",
      requireRole(RoleType.Admin),
      this.userController.getById,
    );
    this.router.post(
      "/",
      requireRole(RoleType.Admin),
      this.userController.create,
    );
    this.router.patch(
      "/:id",
      requireRole(RoleType.Admin),
      this.userController.update,
    );
    this.router.delete(
      "/:id",
      requireRole(RoleType.Admin),
      this.userController.delete,
    );
  }
}
