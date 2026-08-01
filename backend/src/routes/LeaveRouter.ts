import { RoleType } from "@enums";
import { Router } from "express";
import { LeaveRequestController } from "../controllers/LeaveRequestController.ts";
import { MiddlewareFactory } from "../helpers/MiddlewareFactory.ts";
import { requireRole } from "../middleware/requireRole.ts";
import type { IRouter } from "../types/IRouter.ts";

export class LeaveRouter implements IRouter {
  public readonly authenticate = true;
  public readonly routeName = "leave-requests";
  public readonly limiter = MiddlewareFactory.jwtRateLimiter;
  public readonly basePath = "/api/leave-requests";

  constructor(
    private readonly router: Router,
    private readonly leaveController: LeaveRequestController,
  ) {
    this.addRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private addRoutes(): void {
    this.router.get(
      "/",
      requireRole(RoleType.Admin, RoleType.Manager),
      this.leaveController.getAllLeaveRequests,
    );

    this.router.post(
      "/",
      requireRole(RoleType.Employee, RoleType.Manager, RoleType.Admin),
      this.leaveController.createLeaveRequest,
    );

    this.router.delete(
      "/",
      requireRole(RoleType.Employee, RoleType.Manager, RoleType.Admin),
      this.leaveController.deleteLeaveRequest,
    );

    this.router.patch(
      "/approve",
      requireRole(RoleType.Manager, RoleType.Admin),
      this.leaveController.approveLeaveRequest,
    );

    this.router.patch(
      "/reject",
      requireRole(RoleType.Manager, RoleType.Admin),
      this.leaveController.rejectLeaveRequest,
    );

    this.router.get(
      "/pending/manager/:manager_id",
      requireRole(RoleType.Manager, RoleType.Admin),
      this.leaveController.getPendingRequestsByManager,
    );

    this.router.get(
      "/calendar",
      requireRole(RoleType.Manager, RoleType.Admin),
      this.leaveController.getLeaveCalendar,
    );

    this.router.get(
      "/reports/usage",
      requireRole(RoleType.Manager, RoleType.Admin),
      this.leaveController.getLeaveUsageReport,
    );

    this.router.get(
      "/reports/export",
      requireRole(RoleType.Manager, RoleType.Admin),
      this.leaveController.exportLeaveReport,
    );

    this.router.get(
      "/status/:employee_id",
      this.leaveController.getLeaveRequestsByEmployee,
    );

    this.router.get(
      "/remaining/:employee_id",
      this.leaveController.getRemainingLeave,
    );
  }
}
