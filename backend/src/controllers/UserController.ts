import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../helpers/AppError.ts";
import { AUTH_ERRORS } from "../helpers/AuthErrors.ts";
import { Logger } from "../helpers/Logger.ts";
import { ResponseHandler } from "../helpers/ResponseHandler.ts";
import type { AuthenticatedJWTRequest } from "../interfaces/AuthenticatedJWTRequest.interface.ts";
import type { IUserService } from "../types/IUserService.ts";

export class UserController {
  constructor(private readonly service: IUserService) {}

  public getAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const users = await this.service.getAll();
      if (users.length === 0) {
        ResponseHandler.sendErrorResponse(res, StatusCodes.NO_CONTENT);
        return;
      }
      ResponseHandler.sendSuccessResponse(res, users);
    } catch (error) {
      Logger.error("Unexpected error in UserController.getAll", {
        error: error instanceof Error ? error.message : String(error),
      });
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to retrieve users",
      );
    }
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Invalid ID format",
      );
      return;
    }
    try {
      const user = await this.service.getById(id);
      ResponseHandler.sendSuccessResponse(res, user);
    } catch (error) {
      if (error instanceof AppError) {
        ResponseHandler.sendErrorResponse(res, error.statusCode, error.message);
        return;
      }
      Logger.error("Unexpected error in UserController.getById", {
        error: error instanceof Error ? error.message : String(error),
      });
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to retrieve user",
      );
    }
  };

  public getMe = async (
    req: AuthenticatedJWTRequest,
    res: Response,
  ): Promise<void> => {
    const id = req.signedInUser?.token?.id;
    if (!id) {
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        AUTH_ERRORS.TOKEN_IS_INVALID,
      );
      return;
    }
    try {
      const profile = await this.service.getOwnProfile(id);
      ResponseHandler.sendSuccessResponse(res, profile);
    } catch (error) {
      if (error instanceof AppError) {
        ResponseHandler.sendErrorResponse(res, error.statusCode, error.message);
        return;
      }
      Logger.error("Unexpected error in UserController.getMe", {
        error: error instanceof Error ? error.message : String(error),
      });
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to retrieve user",
      );
    }
  };

  public changeOwnPassword = async (
    req: AuthenticatedJWTRequest,
    res: Response,
  ): Promise<void> => {
    const id = req.signedInUser?.token?.id;
    if (!id) {
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        AUTH_ERRORS.TOKEN_IS_INVALID,
      );
      return;
    }

    if (UserController.targetsAnotherUser(req, id)) {
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.FORBIDDEN,
        "Access denied - you can only change your own password",
      );
      return;
    }

    const { currentPassword, newPassword } = (req.body ?? {}) as Record<
      string,
      unknown
    >;
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Current password and new password are required",
      );
      return;
    }

    try {
      await this.service.changeOwnPassword(id, currentPassword, newPassword);
      ResponseHandler.sendSuccessResponse(res, "Password updated");
    } catch (error) {
      if (error instanceof AppError) {
        ResponseHandler.sendErrorResponse(res, error.statusCode, error.message);
        return;
      }
      Logger.error("Unexpected error in UserController.changeOwnPassword", {
        error: error instanceof Error ? error.message : String(error),
      });
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to change password",
      );
    }
  };

  private static targetsAnotherUser(
    req: AuthenticatedJWTRequest,
    id: number,
  ): boolean {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const claimedIds = [req.params?.id, body.id, body.userId];
    return claimedIds.some(
      (claimedId) =>
        claimedId !== undefined &&
        claimedId !== null &&
        String(claimedId) !== String(id),
    );
  }

  public create = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await this.service.create(req.body);
      ResponseHandler.sendSuccessResponse(res, user, StatusCodes.CREATED);
    } catch (error) {
      const statusCode =
        error instanceof AppError ? error.statusCode : StatusCodes.BAD_REQUEST;
      const message = error instanceof Error ? error.message : "Bad request";
      ResponseHandler.sendErrorResponse(res, statusCode, message);
    }
  };

  public update = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Invalid ID format",
      );
      return;
    }
    try {
      const user = await this.service.update(id, req.body);
      ResponseHandler.sendSuccessResponse(res, user);
    } catch (error) {
      const statusCode =
        error instanceof AppError ? error.statusCode : StatusCodes.BAD_REQUEST;
      const message = error instanceof Error ? error.message : "Bad request";
      ResponseHandler.sendErrorResponse(res, statusCode, message);
    }
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    if (!id) {
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "No ID provided",
      );
      return;
    }
    try {
      await this.service.delete(parseInt(id));
      ResponseHandler.sendSuccessResponse(res, "User deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Not found";
      ResponseHandler.sendErrorResponse(res, StatusCodes.NOT_FOUND, message);
    }
  };
}
