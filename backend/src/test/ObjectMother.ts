import type { Request, Response } from "express";
import { Department } from "../entities/Department.entity";
import { JobRole } from "../entities/JobRole.entity";
import { LeaveRequest } from "../entities/LeaveRequest.entity";
import { PublicHoliday } from "../entities/PublicHoliday.entity";
import { User } from "../entities/User.entity";
import { LeaveStatus, LeaveType, RoleType } from "../enums/index";
import type { AuthenticatedJWTRequest } from "../interfaces/AuthenticatedJWTRequest.interface";

export function mockRequest<P extends Record<string, string> = Record<string, string>>(
  params: P = {} as P,
  body: Record<string, unknown> = {},
): Request & { params: P } {
  return { params, body } as unknown as Request & { params: P };
}

export function mockResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
}

export function makeAuthRequest<
  P extends Record<string, string> = Record<string, string>,
>(opts: {
  id?: number;
  role?: RoleType;
  params?: P;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
}): AuthenticatedJWTRequest & { params: P } {
  return {
    signedInUser: {
      token: { id: opts.id ?? 1, role: opts.role ?? RoleType.Employee },
    },
    params: opts.params ?? ({} as P),
    body: opts.body ?? {},
    query: opts.query ?? {},
  } as unknown as AuthenticatedJWTRequest & { params: P };
}

export function makeUser(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: 1,
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@company.com",
    password: "hashed",
    salt: "somesalt",
    role: RoleType.Employee,
    annualLeaveAllowance: 25,
    managerId: null,
    departmentId: 1,
    jobRoleId: 1,
    ...overrides,
  });
}

export function makeLeaveRequest(
  overrides: Partial<LeaveRequest> = {},
): LeaveRequest {
  return Object.assign(new LeaveRequest(), {
    id: 1,
    userId: 1,
    leaveType: LeaveType.Vacation,
    startDate: new Date("2026-09-01"),
    endDate: new Date("2026-09-05"),
    daysRequested: 5,
    status: LeaveStatus.Pending,
    reason: null,
    managerNote: null,
    createdAt: new Date("2026-08-01"),
    ...overrides,
  });
}

export function makeJobRole(overrides: Partial<JobRole> = {}): JobRole {
  return Object.assign(new JobRole(), {
    id: 1,
    name: "Contractor",
    ...overrides,
  });
}

export function makeDepartment(
  overrides: Partial<Department> = {},
): Department {
  return Object.assign(new Department(), {
    id: 1,
    name: "Engineering",
    ...overrides,
  });
}

export function makePublicHoliday(
  overrides: Partial<PublicHoliday> = {},
): PublicHoliday {
  return Object.assign(new PublicHoliday(), {
    id: 1,
    date: new Date("2026-12-25"),
    name: "Christmas Day",
    ...overrides,
  });
}
