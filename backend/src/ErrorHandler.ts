import type { Response } from "express";
import { Logger } from "./helpers/Logger.ts";
import { ResponseHandler } from "./helpers/ResponseHandler.ts";
import { AppError } from "./helpers/AppError.ts";

export class ErrorHandler {
  static handle(err: AppError, res: Response): void {
    Logger.error(err.message);
    ResponseHandler.sendErrorResponse(res, err.statusCode, err.message);
  }
}
