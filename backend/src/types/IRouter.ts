import type { RequestHandler, Router } from "express";

export interface IRouter {
  authenticate: boolean;
  routeName: string;
  limiter: RequestHandler | null;
  basePath: string;

  getRouter(): Router;
}
