import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../helpers/AppError.ts";
import { Logger } from "../helpers/Logger.ts";
import { ResponseHandler } from "../helpers/ResponseHandler.ts";
import type { IEntityController } from "../types/IEntityController.ts";
import type { IJobRoleService } from "../types/IJobRoleService.ts";

export class JobRoleController implements IEntityController {
  constructor(private readonly service: IJobRoleService) {}

  public getAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const jobRoles = await this.service.getAll();
      if (jobRoles.length === 0) {
        ResponseHandler.sendErrorResponse(res, StatusCodes.NO_CONTENT);
        return;
      }
      ResponseHandler.sendSuccessResponse(res, jobRoles);
    } catch (error) {
      Logger.error("Unexpected error in JobRoleController.getAll", {
        error: error instanceof Error ? error.message : String(error),
      });
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to retrieve job roles",
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
      const jobRole = await this.service.getById(id);
      ResponseHandler.sendSuccessResponse(res, jobRole);
    } catch (error) {
      if (error instanceof AppError) {
        ResponseHandler.sendErrorResponse(res, error.statusCode, error.message);
        return;
      }
      Logger.error("Unexpected error in JobRoleController.getById", {
        error: error instanceof Error ? error.message : String(error),
      });
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to retrieve job role",
      );
    }
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    try {
      const jobRole = await this.service.create(req.body.name);
      ResponseHandler.sendSuccessResponse(res, jobRole, StatusCodes.CREATED);
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
      const jobRole = await this.service.update(id, req.body.name);
      ResponseHandler.sendSuccessResponse(res, jobRole);
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
      ResponseHandler.sendSuccessResponse(res, "Job role deleted");
    } catch (error) {
      if (error instanceof AppError) {
        ResponseHandler.sendErrorResponse(res, error.statusCode, error.message);
        return;
      }
      Logger.error("Unexpected error in JobRoleController.delete", {
        error: error instanceof Error ? error.message : String(error),
      });
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to delete job role",
      );
    }
  };
}
