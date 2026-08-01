import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../helpers/AppError.ts";
import { ResponseHandler } from "../helpers/ResponseHandler.ts";
import type { IPublicHolidayService } from "../types/IPublicHolidayService.ts";

export class PublicHolidayController {
  constructor(private readonly service: IPublicHolidayService) {}

  getAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const holidays = await this.service.getAll();
      res.status(StatusCodes.OK).json(holidays);
    } catch (err) {
      this.handleError(res, err);
    }
  };

  getById = async (
    req: Request & { params: { id: string } },
    res: Response,
  ): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Invalid ID",
      );
      return;
    }
    try {
      const holiday = await this.service.getById(id);
      res.status(StatusCodes.OK).json(holiday);
    } catch (err) {
      this.handleError(res, err);
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const { date, name } = req.body as { date?: string; name?: string };
    if (!date || !name) {
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "date and name are required",
      );
      return;
    }
    try {
      const holiday = await this.service.create(date, name);
      res.status(StatusCodes.CREATED).json(holiday);
    } catch (err) {
      this.handleError(res, err);
    }
  };

  update = async (
    req: Request & { params: { id: string } },
    res: Response,
  ): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Invalid ID",
      );
      return;
    }
    try {
      const holiday = await this.service.update(
        id,
        req.body as { date?: string; name?: string },
      );
      res.status(StatusCodes.OK).json(holiday);
    } catch (err) {
      this.handleError(res, err);
    }
  };

  delete = async (
    req: Request & { params: { id: string } },
    res: Response,
  ): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Invalid ID",
      );
      return;
    }
    try {
      await this.service.delete(id);
      res.status(StatusCodes.NO_CONTENT).send();
    } catch (err) {
      this.handleError(res, err);
    }
  };

  private handleError(res: Response, err: unknown): void {
    if (err instanceof AppError) {
      ResponseHandler.sendErrorResponse(res, err.statusCode, err.message);
      return;
    }
    ResponseHandler.sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Internal server error",
    );
  }
}
