import type { RoleType } from "../enums/index.ts";

export type TokenPayload = { id?: number; role?: RoleType };
export type ServiceResult = { message: string; data: unknown };
export type DateRangeQuery = { from?: string; to?: string };
export type CsvExportResult = { csv: string; filename: string };

export interface ILeaveRequestService {
  createLeaveRequest(
    token: TokenPayload | undefined,
    body: Record<string, unknown>,
  ): Promise<ServiceResult>;
  deleteLeaveRequest(
    token: TokenPayload | undefined,
    body: Record<string, unknown>,
  ): Promise<ServiceResult>;
  approveLeaveRequest(
    token: TokenPayload | undefined,
    body: Record<string, unknown>,
  ): Promise<ServiceResult>;
  rejectLeaveRequest(
    token: TokenPayload | undefined,
    body: Record<string, unknown>,
  ): Promise<ServiceResult>;
  getLeaveRequestsByEmployee(
    token: TokenPayload | undefined,
    employeeId: number,
  ): Promise<ServiceResult>;
  getRemainingLeave(
    token: TokenPayload | undefined,
    employeeId: number,
  ): Promise<ServiceResult>;
  getPendingRequestsByManager(
    token: TokenPayload | undefined,
    managerId: number,
    query: DateRangeQuery,
  ): Promise<ServiceResult>;
  getAllLeaveRequests(
    token: TokenPayload | undefined,
    query: Record<string, unknown>,
  ): Promise<ServiceResult>;
  getLeaveCalendar(
    token: TokenPayload | undefined,
    query: DateRangeQuery,
  ): Promise<ServiceResult>;
  getLeaveUsageReport(
    token: TokenPayload | undefined,
    query: Record<string, unknown>,
  ): Promise<ServiceResult>;
  exportLeaveReport(
    token: TokenPayload | undefined,
    query: Record<string, unknown>,
  ): Promise<CsvExportResult>;
}
