import { StatusCodes } from "http-status-codes";
import { mock, MockProxy } from "jest-mock-extended";
import { AppError } from "../helpers/AppError";
import { mockRequest, mockResponse } from "../test/ObjectMother";
import type { ILoginService } from "../types/ILoginService";
import { LoginController } from "./LoginController";

let mockService: MockProxy<ILoginService>;
let controller: LoginController;

beforeEach(() => {
  mockService = mock<ILoginService>();
  controller = new LoginController(mockService);
  jest.clearAllMocks();
});

describe("LoginController", () => {
  it("login - success returns 202 with JWT token", async () => {
    // Arrange
    const email = "alice@company.com";
    const password = "Password123!";
    const token = "signed.jwt.token";
    mockService.login.mockResolvedValue(token);
    const req = mockRequest({}, { email, password });
    const res = mockResponse();

    // Act
    await controller.login(req, res);

    // Assert
    expect(mockService.login).toHaveBeenCalledWith(email, password);
    expect(res.status).toHaveBeenCalledWith(StatusCodes.ACCEPTED);
    expect(res.send).toHaveBeenCalledWith(token);
  });

  it("login - user not found returns 401", async () => {
    // Arrange
    mockService.login.mockRejectedValue(
      new AppError("User not found", StatusCodes.UNAUTHORIZED),
    );
    const req = mockRequest(
      {},
      { email: "nobody@company.com", password: "Password123!" },
    );
    const res = mockResponse();

    // Act
    await controller.login(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
  });

  it("login - incorrect password returns 401", async () => {
    // Arrange
    mockService.login.mockRejectedValue(
      new AppError("Incorrect password", StatusCodes.UNAUTHORIZED),
    );
    const req = mockRequest(
      {},
      { email: "alice@company.com", password: "wrong" },
    );
    const res = mockResponse();

    // Act
    await controller.login(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
  });

  it("login - missing credentials returns 400", async () => {
    // Arrange
    mockService.login.mockRejectedValue(
      new AppError("Email and password are required", StatusCodes.BAD_REQUEST),
    );
    const req = mockRequest({}, {});
    const res = mockResponse();

    // Act
    await controller.login(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("login - unexpected error returns 400 fallback", async () => {
    // Arrange
    mockService.login.mockRejectedValue(new Error("unexpected"));
    const req = mockRequest({}, { email: "alice@company.com", password: "pw" });
    const res = mockResponse();

    // Act
    await controller.login(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });
});
