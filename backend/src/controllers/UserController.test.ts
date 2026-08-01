import { mock, MockProxy } from "jest-mock-extended";
import { StatusCodes } from "http-status-codes";
import { UserController } from "./UserController";
import { AppError } from "../helpers/AppError";
import type { IUserService } from "../types/IUserService";
import { makeUser, mockRequest, mockResponse } from "../test/ObjectMother";

let mockService: MockProxy<IUserService>;
let controller: UserController;

beforeEach(() => {
  mockService = mock<IUserService>();
  controller = new UserController(mockService);
  jest.clearAllMocks();
});

describe("UserController.getAll", () => {
  it("returns 200 with users when service returns results", async () => {
    // Arrange
    mockService.getAll.mockResolvedValue([makeUser()]);
    const req = mockRequest();
    const res = mockResponse();

    // Act
    await controller.getAll(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 204 when service returns empty array", async () => {
    // Arrange
    mockService.getAll.mockResolvedValue([]);
    const req = mockRequest();
    const res = mockResponse();

    // Act
    await controller.getAll(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.NO_CONTENT);
  });

  it("returns 500 on unexpected error", async () => {
    // Arrange
    mockService.getAll.mockRejectedValue(new Error("DB failure"));
    const req = mockRequest();
    const res = mockResponse();

    // Act
    await controller.getAll(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});

describe("UserController.getById", () => {
  it("returns 400 for non-numeric id", async () => {
    // Arrange
    const req = mockRequest({ id: "abc" });
    const res = mockResponse();

    // Act
    await controller.getById(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("returns 200 with user from service", async () => {
    // Arrange
    mockService.getById.mockResolvedValue(makeUser());
    const req = mockRequest({ id: "1" });
    const res = mockResponse();

    // Act
    await controller.getById(req, res);

    // Assert
    expect(mockService.getById).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 404 when service throws NOT_FOUND AppError", async () => {
    // Arrange
    mockService.getById.mockRejectedValue(
      new AppError("User not found with ID: 99", StatusCodes.NOT_FOUND),
    );
    const req = mockRequest({ id: "99" });
    const res = mockResponse();

    // Act
    await controller.getById(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
  });

  it("returns 500 on unexpected non-AppError from service", async () => {
    // Arrange
    mockService.getById.mockRejectedValue(new Error("DB failure"));
    const req = mockRequest({ id: "1" });
    const res = mockResponse();

    // Act
    await controller.getById(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});

describe("UserController.create", () => {
  it("returns 201 with created user on success", async () => {
    // Arrange
    mockService.create.mockResolvedValue(makeUser());
    const req = mockRequest(
      {},
      { firstName: "Alice", email: "alice@company.com" },
    );
    const res = mockResponse();

    // Act
    await controller.create(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
  });

  it("returns 422 when service throws validation AppError", async () => {
    // Arrange
    mockService.create.mockRejectedValue(
      new AppError("isNotEmpty", StatusCodes.UNPROCESSABLE_ENTITY),
    );
    const req = mockRequest({}, {});
    const res = mockResponse();

    // Act
    await controller.create(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNPROCESSABLE_ENTITY);
  });
});

describe("UserController.update", () => {
  it("returns 400 for non-numeric id", async () => {
    // Arrange
    const req = mockRequest({ id: "xyz" });
    const res = mockResponse();

    // Act
    await controller.update(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("returns 200 with updated user on success", async () => {
    // Arrange
    mockService.update.mockResolvedValue(
      makeUser({ annualLeaveAllowance: 30 }),
    );
    const req = mockRequest({ id: "1" }, { annualLeaveAllowance: 30 });
    const res = mockResponse();

    // Act
    await controller.update(req, res);

    // Assert
    expect(mockService.update).toHaveBeenCalledWith(1, {
      annualLeaveAllowance: 30,
    });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 404 when service throws NOT_FOUND AppError", async () => {
    // Arrange
    mockService.update.mockRejectedValue(
      new AppError("User not found", StatusCodes.NOT_FOUND),
    );
    const req = mockRequest({ id: "99" }, {});
    const res = mockResponse();

    // Act
    await controller.update(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
  });
});

describe("UserController.delete", () => {
  it("returns 400 when no id is provided", async () => {
    // Arrange
    const req = mockRequest(); // params empty → req.params.id is undefined
    const res = mockResponse();

    // Act
    await controller.delete(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("returns 200 when user is deleted successfully", async () => {
    // Arrange
    mockService.delete.mockResolvedValue();
    const req = mockRequest({ id: "7" });
    const res = mockResponse();

    // Act
    await controller.delete(req, res);

    // Assert
    expect(mockService.delete).toHaveBeenCalledWith(7);
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 404 when service throws NOT_FOUND AppError", async () => {
    // Arrange
    mockService.delete.mockRejectedValue(
      new AppError("User not found", StatusCodes.NOT_FOUND),
    );
    const req = mockRequest({ id: "99" });
    const res = mockResponse();

    // Act
    await controller.delete(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
  });
});
