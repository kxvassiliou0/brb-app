import type { NextFunction, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { RoleType } from "../enums/index";
import type { AuthenticatedJWTRequest } from "../interfaces/AuthenticatedJWTRequest.interface";
import { requireRole } from "./requireRole";

jest.mock("../helpers/Logger");
jest.mock("../helpers/ResponseHandler");

import { ResponseHandler } from "../helpers/ResponseHandler";

function mockResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeRequest(role?: RoleType): AuthenticatedJWTRequest {
  return {
    signedInUser: role
      ? { token: { email: "user@test.com", role } }
      : undefined,
    originalUrl: "/api/test",
    method: "GET",
  } as unknown as AuthenticatedJWTRequest;
}

describe("requireRole", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls next() when the user has the required role", () => {
    // Arrange
    const req = makeRequest(RoleType.Admin);
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    // Act
    requireRole(RoleType.Admin)(req, res, next);

    // Assert
    expect(next).toHaveBeenCalled();
    expect(ResponseHandler.sendErrorResponse).not.toHaveBeenCalled();
  });

  it("calls next() when the user has one of multiple allowed roles", () => {
    // Arrange
    const req = makeRequest(RoleType.Manager);
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    // Act
    requireRole(RoleType.Admin, RoleType.Manager)(req, res, next);

    // Assert
    expect(next).toHaveBeenCalled();
  });

  it("returns FORBIDDEN when the user does not have the required role", () => {
    // Arrange
    const req = makeRequest(RoleType.Employee);
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    // Act
    requireRole(RoleType.Admin)(req, res, next);

    // Assert
    expect(ResponseHandler.sendErrorResponse).toHaveBeenCalledWith(
      res,
      StatusCodes.FORBIDDEN,
      `Access denied - requires one of: ${RoleType.Admin}`,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN when signedInUser is not present on the request", () => {
    // Arrange
    const req = makeRequest(undefined);
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    // Act
    requireRole(RoleType.Admin)(req, res, next);

    // Assert
    expect(ResponseHandler.sendErrorResponse).toHaveBeenCalledWith(
      res,
      StatusCodes.FORBIDDEN,
      "Access denied",
    );
    expect(next).not.toHaveBeenCalled();
  });
});
