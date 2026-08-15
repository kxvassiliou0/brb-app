import express, { type Response, type NextFunction } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import type { AuthenticatedJWTRequest } from "../interfaces/AuthenticatedJWTRequest.interface.ts";
import { AUTH_ERRORS } from "./AuthErrors.ts";
import { Logger } from "./Logger.ts";
import { ResponseHandler } from "./ResponseHandler.ts";

const DEFAULT_RATE_LIMIT_MAX = 500;

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function rateLimitMax(): number {
  const configured = Number(process.env.RATE_LIMIT_MAX);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_RATE_LIMIT_MAX;
}

export class MiddlewareFactory {
  public static readonly TOO_MANY_REQUESTS_MESSAGE =
    "Too many requests - try again later";

  static readonly loginLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: rateLimitMax(),
    message: MiddlewareFactory.TOO_MANY_REQUESTS_MESSAGE,
    standardHeaders: true,
    legacyHeaders: false,
  });

  static readonly jwtRateLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: rateLimitMax(),
    message: MiddlewareFactory.TOO_MANY_REQUESTS_MESSAGE,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: express.Request): string => {
      const authedReq = req as AuthenticatedJWTRequest;
      return (
        authedReq.signedInUser?.token?.email ?? ipKeyGenerator(req.ip ?? "")
      );
    },
  });

  static logRouteAccess(route: string) {
    return (
      req: express.Request,
      _res: express.Response,
      next: express.NextFunction,
    ): void => {
      Logger.info(`${route} accessed by ${req.ip}`);
      next();
    };
  }

  static authenticateToken = (
    req: AuthenticatedJWTRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      Logger.error(AUTH_ERRORS.TOKEN_NOT_FOUND);
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        AUTH_ERRORS.TOKEN_NOT_FOUND,
      );
      return;
    }

    const tokenReceived = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET_KEY) {
      Logger.error(AUTH_ERRORS.TOKEN_SECRET_NOT_DEFINED);
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        AUTH_ERRORS.TOKEN_IS_INVALID,
      );
      return;
    }

    jwt.verify(tokenReceived, process.env.JWT_SECRET_KEY, (err, payload) => {
      if (err) {
        Logger.error(AUTH_ERRORS.TOKEN_IS_INVALID);
        ResponseHandler.sendErrorResponse(
          res,
          StatusCodes.UNAUTHORIZED,
          AUTH_ERRORS.TOKEN_IS_INVALID,
        );
        return;
      }
      req.signedInUser = payload as AuthenticatedJWTRequest["signedInUser"];
      next();
    });
  };
}
