import type { NextFunction, Response } from "express";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import type { AuthenticatedJWTRequest } from "../interfaces/AuthenticatedJWTRequest.interface";
import { AUTH_ERRORS } from "./AuthErrors";
import { MiddlewareFactory } from "./MiddlewareFactory";
import { TEST_JWT_SECRET } from "../test/testConfig";

jest.mock("./Logger");
jest.mock("./ResponseHandler");

import { Logger } from "./Logger";
import { ResponseHandler } from "./ResponseHandler";

function mockRequest(
  headers: Record<string, string> = {},
): AuthenticatedJWTRequest {
  return { headers, ip: "127.0.0.1" } as unknown as AuthenticatedJWTRequest;
}

function mockResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("MiddlewareFactory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET_KEY = TEST_JWT_SECRET;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET_KEY;
  });

  describe("logRouteAccess", () => {
    it("logs the route and IP then calls next()", () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn() as NextFunction;

      // Act
      MiddlewareFactory.logRouteAccess("users")(req, res, next);

      // Assert
      expect(Logger.info).toHaveBeenCalledWith("users accessed by 127.0.0.1");
      expect(next).toHaveBeenCalled();
    });
  });

  describe("authenticateToken", () => {
    it("returns UNAUTHORIZED when the Authorization header is missing", () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn() as NextFunction;

      // Act
      MiddlewareFactory.authenticateToken(req, res, next);

      // Assert
      expect(ResponseHandler.sendErrorResponse).toHaveBeenCalledWith(
        res,
        StatusCodes.UNAUTHORIZED,
        AUTH_ERRORS.TOKEN_NOT_FOUND,
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("returns BAD_REQUEST when JWT_SECRET_KEY environment variable is not set", () => {
      // Arrange
      delete process.env.JWT_SECRET_KEY;
      const req = mockRequest({ authorization: "Bearer sometoken" });
      const res = mockResponse();
      const next = jest.fn() as NextFunction;

      // Act
      MiddlewareFactory.authenticateToken(req, res, next);

      // Assert
      expect(ResponseHandler.sendErrorResponse).toHaveBeenCalledWith(
        res,
        StatusCodes.BAD_REQUEST,
        AUTH_ERRORS.TOKEN_IS_INVALID,
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("returns UNAUTHORIZED when the token signature is invalid", () => {
      // Arrange
      const req = mockRequest({ authorization: "Bearer not.a.valid.token" });
      const res = mockResponse();
      const next = jest.fn() as NextFunction;

      // Act
      MiddlewareFactory.authenticateToken(req, res, next);

      // Assert
      expect(ResponseHandler.sendErrorResponse).toHaveBeenCalledWith(
        res,
        StatusCodes.UNAUTHORIZED,
        AUTH_ERRORS.TOKEN_IS_INVALID,
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next() and attaches signedInUser to req when token is valid", () => {
      // Arrange
      const payload = {
        token: { id: 1, email: "user@test.com", role: "Employee" },
      };
      const token = jwt.sign(payload, TEST_JWT_SECRET);
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      const next = jest.fn() as NextFunction;

      // Act
      MiddlewareFactory.authenticateToken(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(req.signedInUser).toBeDefined();
      expect(req.signedInUser?.token?.email).toBe("user@test.com");
      expect(ResponseHandler.sendErrorResponse).not.toHaveBeenCalled();
    });
  });
});
