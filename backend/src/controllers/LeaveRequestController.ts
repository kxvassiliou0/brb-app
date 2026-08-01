import type { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../helpers/AppError.ts";
import { Logger } from "../helpers/Logger.ts";
import { ResponseHandler } from "../helpers/ResponseHandler.ts";
import type { AuthenticatedJWTRequest as Request } from "../interfaces/AuthenticatedJWTRequest.interface.ts";
import type { ILeaveRequestService } from "../types/ILeaveRequestService.ts";

export class LeaveRequestController {
  constructor(private readonly service: ILeaveRequestService) {}

  private handleError(res: Response, context: string, err: unknown): void {
    if (err instanceof AppError) {
      ResponseHandler.sendErrorResponse(res, err.statusCode, err.message);
      return;
    }
    Logger.error(`Unexpected error in ${context}`, {
      error: err instanceof Error ? err.message : String(err),
    });
    ResponseHandler.sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Internal server error",
    );
  }

  createLeaveRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.createLeaveRequest(
        req.signedInUser?.token,
        req.body,
      );
      ResponseHandler.sendSuccessResponse(
        res,
        result.data,
        StatusCodes.CREATED,
        result.message,
      );
    } catch (err) {
      this.handleError(res, "createLeaveRequest", err);
    }
  };

  deleteLeaveRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.deleteLeaveRequest(
        req.signedInUser?.token,
        req.body,
      );
      ResponseHandler.sendSuccessResponse(
        res,
        result.data,
        StatusCodes.OK,
        result.message,
      );
    } catch (err) {
      this.handleError(res, "deleteLeaveRequest", err);
    }
  };

  approveLeaveRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.approveLeaveRequest(
        req.signedInUser?.token,
        req.body,
      );
      ResponseHandler.sendSuccessResponse(
        res,
        result.data,
        StatusCodes.OK,
        result.message,
      );
    } catch (err) {
      this.handleError(res, "approveLeaveRequest", err);
    }
  };

  rejectLeaveRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.rejectLeaveRequest(
        req.signedInUser?.token,
        req.body,
      );
      ResponseHandler.sendSuccessResponse(
        res,
        result.data,
        StatusCodes.OK,
        result.message,
      );
    } catch (err) {
      this.handleError(res, "rejectLeaveRequest", err);
    }
  };

  getLeaveRequestsByEmployee = async (
    req: Request & { params: { employee_id: string } },
    res: Response,
  ): Promise<void> => {
    const employeeId = parseInt(req.params.employee_id, 10);
    if (isNaN(employeeId)) {
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Invalid employee ID",
      );
      return;
    }
    try {
      const result = await this.service.getLeaveRequestsByEmployee(
        req.signedInUser?.token,
        employeeId,
      );
      ResponseHandler.sendSuccessResponse(
        res,
        result.data,
        StatusCodes.OK,
        result.message,
      );
    } catch (err) {
      this.handleError(res, "getLeaveRequestsByEmployee", err);
    }
  };

  getRemainingLeave = async (
    req: Request & { params: { employee_id: string } },
    res: Response,
  ): Promise<void> => {
    const employeeId = parseInt(req.params.employee_id, 10);
    if (isNaN(employeeId)) {
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Invalid employee ID",
      );
      return;
    }
    try {
      const result = await this.service.getRemainingLeave(
        req.signedInUser?.token,
        employeeId,
      );
      ResponseHandler.sendSuccessResponse(
        res,
        result.data,
        StatusCodes.OK,
        result.message,
      );
    } catch (err) {
      this.handleError(res, "getRemainingLeave", err);
    }
  };

  getPendingRequestsByManager = async (
    req: Request & { params: { manager_id: string } },
    res: Response,
  ): Promise<void> => {
    const managerId = parseInt(req.params.manager_id, 10);
    if (isNaN(managerId)) {
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Invalid manager ID",
      );
      return;
    }
    try {
      const result = await this.service.getPendingRequestsByManager(
        req.signedInUser?.token,
        managerId,
        req.query as { from?: string; to?: string },
      );
      ResponseHandler.sendSuccessResponse(
        res,
        result.data,
        StatusCodes.OK,
        result.message,
      );
    } catch (err) {
      this.handleError(res, "getPendingRequestsByManager", err);
    }
  };

  getAllLeaveRequests = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.getAllLeaveRequests(
        req.signedInUser?.token,
        req.query as Record<string, unknown>,
      );
      ResponseHandler.sendSuccessResponse(
        res,
        result.data,
        StatusCodes.OK,
        result.message,
      );
    } catch (err) {
      this.handleError(res, "getAllLeaveRequests", err);
    }
  };

  getLeaveCalendar = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.getLeaveCalendar(
        req.signedInUser?.token,
        req.query as { from?: string; to?: string },
      );
      ResponseHandler.sendSuccessResponse(
        res,
        result.data,
        StatusCodes.OK,
        result.message,
      );
    } catch (err) {
      this.handleError(res, "getLeaveCalendar", err);
    }
  };

  getLeaveUsageReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.getLeaveUsageReport(
        req.signedInUser?.token,
        req.query as Record<string, unknown>,
      );
      ResponseHandler.sendSuccessResponse(
        res,
        result.data,
        StatusCodes.OK,
        result.message,
      );
    } catch (err) {
      this.handleError(res, "getLeaveUsageReport", err);
    }
  };

  exportLeaveReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { csv, filename } = await this.service.exportLeaveReport(
        req.signedInUser?.token,
        req.query as Record<string, unknown>,
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.status(StatusCodes.OK).send(csv);
    } catch (err) {
      this.handleError(res, "exportLeaveReport", err);
    }
  };
}
