import express, { type Request, type Response } from "express";
import helmet from "helmet";
import { StatusCodes } from "http-status-codes";
import morgan, { type StreamOptions } from "morgan";
import { type DataSource } from "typeorm";
import { ErrorHandler } from "./ErrorHandler.ts";
import { AppError } from "./helpers/AppError.ts";
import { AUTH_ERRORS } from "./helpers/AuthErrors.ts";
import { Logger } from "./helpers/Logger.ts";
import { MiddlewareFactory } from "./helpers/MiddlewareFactory.ts";
import { ResponseHandler } from "./helpers/ResponseHandler.ts";
import type { IRouter } from "./types/IRouter.ts";

export class Server {
  public static readonly ERROR_TOKEN_IS_INVALID = AUTH_ERRORS.TOKEN_IS_INVALID;
  public static readonly ERROR_TOKEN_NOT_FOUND = AUTH_ERRORS.TOKEN_NOT_FOUND;
  public static readonly ERROR_TOKEN_SECRET_NOT_DEFINED =
    AUTH_ERRORS.TOKEN_SECRET_NOT_DEFINED;

  private readonly app: express.Application;

  constructor(
    private readonly port: string | number,
    private readonly routers: Array<IRouter>,
    private readonly appDataSource: DataSource,
  ) {
    this.app = express();
    this.app.use(helmet());
    this.app.disable("x-powered-by");

    this.initialiseMiddlewares();
    this.initialiseRoutes();
    this.initialise404Handler();
    this.initialiseErrorHandling();
  }

  private initialiseMiddlewares(): void {
    const morganStream: StreamOptions = {
      write: (message: string): void => {
        Logger.info(message.trim());
      },
    };
    this.app.use(this.corsMiddleware());
    this.app.use(express.json({ limit: "10kb" }));
    this.app.use(morgan("combined", { stream: morganStream }));
  }

  private corsMiddleware(): express.RequestHandler {
    return (req: Request, res: Response, next: express.NextFunction): void => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, DELETE, OPTIONS",
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );
      if (req.method === "OPTIONS") {
        res.sendStatus(204);
        return;
      }
      next();
    };
  }

  private initialiseRoutes(): void {
    for (const route of this.routers) {
      const middlewares: Array<express.RequestHandler> = [];
      if (route.authenticate) {
        middlewares.push(MiddlewareFactory.authenticateToken);
      }
      if (route.limiter) {
        middlewares.push(route.limiter);
      }
      middlewares.push(MiddlewareFactory.logRouteAccess(route.routeName));
      this.app.use(route.basePath, ...middlewares, route.getRouter());
    }
  }

  private initialise404Handler(): void {
    this.app.use((req: Request, res: Response) => {
      const requestedUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.NOT_FOUND,
        `Route ${requestedUrl} not found`,
      );
    });
  }

  private initialiseErrorHandling(): void {
    this.app.use((err: AppError, _req: Request, res: Response) => {
      ErrorHandler.handle(err, res);
    });
  }

  public async start(): Promise<void> {
    await this.initialiseDataSource();
    this.app.listen(this.port, () => {
      Logger.info(`Server running on http://localhost:${this.port}`);
    });
  }

  private async initialiseDataSource(): Promise<void> {
    try {
      await this.appDataSource.initialize();
      Logger.info("Data Source initialised");
    } catch (error) {
      Logger.error("Error during initialisation", { error });
      throw error;
    }
  }
}
