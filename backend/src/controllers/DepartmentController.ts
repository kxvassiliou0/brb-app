import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../helpers/AppError.ts";
import { Logger } from "../helpers/Logger.ts";
import { ResponseHandler } from "../helpers/ResponseHandler.ts";
import type { IDepartmentService } from "../types/IDepartmentService.ts";
import type { IEntityController } from "../types/IEntityController.ts";

export class DepartmentController implements IEntityController {
  constructor(private readonly service: IDepartmentService) {}

  public getAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const departments = await this.service.getAll();
      if (departments.length === 0) {
        ResponseHandler.sendErrorResponse(res, StatusCodes.NO_CONTENT);
        return;
      }
      ResponseHandler.sendSuccessResponse(res, departments);
    } catch (error) {
      Logger.error("Unexpected error in DepartmentController.getAll", {
        error: error instanceof Error ? error.message : String(error),
      });
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to retrieve departments",
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
      const department = await this.service.getById(id);
      ResponseHandler.sendSuccessResponse(res, department);
    } catch (error) {
      if (error instanceof AppError) {
        ResponseHandler.sendErrorResponse(res, error.statusCode, error.message);
        return;
      }
      Logger.error("Unexpected error in DepartmentController.getById", {
        error: error instanceof Error ? error.message : String(error),
      });
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to retrieve department",
      );
    }
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    try {
      const department = await this.service.create(req.body.name);
      ResponseHandler.sendSuccessResponse(res, department, StatusCodes.CREATED);
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
      const department = await this.service.update(id, req.body.name);
      ResponseHandler.sendSuccessResponse(res, department);
    } catch (error) {
      const statusCode =
        error instanceof AppError ? error.statusCode : StatusCodes.BAD_REQUEST;
      const message = error instanceof Error ? error.message : "Bad request";
      ResponseHandler.sendErrorResponse(res, statusCode, message);
    }
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (!id) {
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "No ID provided",
      );
      return;
    }
    try {
      await this.service.delete(parseInt(id as string));
      ResponseHandler.sendSuccessResponse(res, "Department deleted");
    } catch (error) {
      if (error instanceof AppError) {
        ResponseHandler.sendErrorResponse(res, error.statusCode, error.message);
        return;
      }
      Logger.error("Unexpected error in DepartmentController.delete", {
        error: error instanceof Error ? error.message : String(error),
      });
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to delete department",
      );
    }
  };
}
