import type { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "./ErrorHandler";
import { AppError } from "./helpers/AppError";

jest.mock("./helpers/Logger");
jest.mock("./helpers/ResponseHandler");

import { Logger } from "./helpers/Logger";
import { ResponseHandler } from "./helpers/ResponseHandler";

function mockResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("ErrorHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("logs the error message and sends the error response with the AppError status code", () => {
    // Arrange
    const err = new AppError("Something failed", StatusCodes.BAD_REQUEST);
    const res = mockResponse();

    // Act
    ErrorHandler.handle(err, res);

    // Assert
    expect(Logger.error).toHaveBeenCalledWith("Something failed");
    expect(ResponseHandler.sendErrorResponse).toHaveBeenCalledWith(
      res,
      StatusCodes.BAD_REQUEST,
      "Something failed",
    );
  });
});
