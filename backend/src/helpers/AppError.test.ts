import { StatusCodes } from "http-status-codes";
import { AppError } from "./AppError";

describe("AppError", () => {
  it("sets message and statusCode from constructor arguments", () => {
    // Arrange + Act
    const err = new AppError("Something went wrong", StatusCodes.BAD_REQUEST);

    // Assert
    expect(err.message).toBe("Something went wrong");
    expect(err.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it("defaults statusCode to 500 when not provided", () => {
    // Arrange + Act
    const err = new AppError("Server error");

    // Assert
    expect(err.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  it("is an instance of Error", () => {
    // Arrange + Act
    const err = new AppError("test");

    // Assert
    expect(err).toBeInstanceOf(Error);
  });

  it("captures a stack trace", () => {
    // Arrange + Act
    const err = new AppError("test");

    // Assert
    expect(err.stack).toBeDefined();
  });
});
