import { Router } from "express";
import { MiddlewareFactory } from "../helpers/MiddlewareFactory.ts";
import type { ILoginController } from "../types/ILoginController.ts";
import type { IRouter } from "../types/IRouter.ts";

export class LoginRouter implements IRouter {
  public readonly authenticate = false;
  public readonly routeName = "login";
  public readonly limiter = MiddlewareFactory.loginLimiter;
  public readonly basePath = "/api/login";

  constructor(
    private router: Router,
    private loginController: ILoginController,
  ) {
    this.addRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private addRoutes() {
    this.router.post("/", this.loginController.login);
  }
}
