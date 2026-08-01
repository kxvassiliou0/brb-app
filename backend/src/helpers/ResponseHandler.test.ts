import type { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ResponseHandler } from "./ResponseHandler";

function mockResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("ResponseHandler", () => {
  describe("sendSuccessResponse", () => {
    it("sends 200 with data wrapped in a data key by default", () => {
      // Arrange
      const res = mockResponse();

      // Act
      ResponseHandler.sendSuccessResponse(res, { id: 1 });

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: { id: 1 } });
    });

    it("sends the provided status code", () => {
      // Arrange
      const res = mockResponse();

      // Act
      ResponseHandler.sendSuccessResponse(res, { id: 1 }, StatusCodes.CREATED);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(res.json).toHaveBeenCalledWith({ data: { id: 1 } });
    });
  });

  describe("sendErrorResponse", () => {
    it("sends the provided status code and message wrapped in an error key", () => {
      // Arrange
      const res = mockResponse();

      // Act
      ResponseHandler.sendErrorResponse(
        res,
        StatusCodes.NOT_FOUND,
        "Not found",
      );

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith({ error: "Not found" });
    });

    it("sends a default message when none is provided", () => {
      // Arrange
      const res = mockResponse();

      // Act
      ResponseHandler.sendErrorResponse(res, StatusCodes.INTERNAL_SERVER_ERROR);

      // Assert
      expect(res.json).toHaveBeenCalledWith({ error: "An error occurred" });
    });
  });
});
