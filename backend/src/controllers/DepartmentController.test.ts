import { mock, MockProxy } from "jest-mock-extended";
import { StatusCodes } from "http-status-codes";
import { DepartmentController } from "./DepartmentController";
import { AppError } from "../helpers/AppError";
import type { IDepartmentService } from "../types/IDepartmentService";
import {
  makeDepartment,
  mockRequest,
  mockResponse,
} from "../test/ObjectMother";

let mockService: MockProxy<IDepartmentService>;
let controller: DepartmentController;

beforeEach(() => {
  mockService = mock<IDepartmentService>();
  controller = new DepartmentController(mockService);
  jest.clearAllMocks();
});

describe("DepartmentController.getAll", () => {
  it("returns 200 with departments when service returns results", async () => {
    // Arrange
    mockService.getAll.mockResolvedValue([makeDepartment()]);
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

describe("DepartmentController.getById", () => {
  it("returns 400 for non-numeric id", async () => {
    // Arrange
    const req = mockRequest({ id: "abc" });
    const res = mockResponse();

    // Act
    await controller.getById(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("returns 200 with department from service", async () => {
    // Arrange
    mockService.getById.mockResolvedValue(makeDepartment());
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
      new AppError("Department not found with ID: 99", StatusCodes.NOT_FOUND),
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

describe("DepartmentController.create", () => {
  it("returns 201 with created department on success", async () => {
    // Arrange
    mockService.create.mockResolvedValue(makeDepartment({ name: "Legal" }));
    const req = mockRequest({}, { name: "Legal" });
    const res = mockResponse();

    // Act
    await controller.create(req, res);

    // Assert
    expect(mockService.create).toHaveBeenCalledWith("Legal");
    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
  });

  it("returns 422 when service throws validation AppError", async () => {
    // Arrange
    mockService.create.mockRejectedValue(
      new AppError("isNotEmpty", StatusCodes.UNPROCESSABLE_ENTITY),
    );
    const req = mockRequest({}, { name: "" });
    const res = mockResponse();

    // Act
    await controller.create(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNPROCESSABLE_ENTITY);
  });
});

describe("DepartmentController.update", () => {
  it("returns 400 for non-numeric id", async () => {
    // Arrange
    const req = mockRequest({ id: "xyz" });
    const res = mockResponse();

    // Act
    await controller.update(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("returns 200 with updated department on success", async () => {
    // Arrange
    mockService.update.mockResolvedValue(
      makeDepartment({ name: "Software Engineering" }),
    );
    const req = mockRequest({ id: "1" }, { name: "Software Engineering" });
    const res = mockResponse();

    // Act
    await controller.update(req, res);

    // Assert
    expect(mockService.update).toHaveBeenCalledWith(1, "Software Engineering");
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 422 when service throws UNPROCESSABLE_ENTITY AppError", async () => {
    // Arrange
    mockService.update.mockRejectedValue(
      new AppError("name must not be empty", StatusCodes.UNPROCESSABLE_ENTITY),
    );
    const req = mockRequest({ id: "1" }, { name: "" });
    const res = mockResponse();

    // Act
    await controller.update(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNPROCESSABLE_ENTITY);
  });

  it("returns 400 when service throws a non-AppError", async () => {
    // Arrange
    mockService.update.mockRejectedValue(new Error("unexpected error"));
    const req = mockRequest({ id: "1" }, { name: "X" });
    const res = mockResponse();

    // Act
    await controller.update(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });
});

describe("DepartmentController.delete", () => {
  it("returns 400 when no id is provided", async () => {
    // Arrange
    const req = mockRequest(); // params empty → req.params.id is undefined
    const res = mockResponse();

    // Act
    await controller.delete(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("returns 200 when department is deleted successfully", async () => {
    // Arrange
    mockService.delete.mockResolvedValue();
    const req = mockRequest({ id: "5" });
    const res = mockResponse();

    // Act
    await controller.delete(req, res);

    // Assert
    expect(mockService.delete).toHaveBeenCalledWith(5);
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 409 when service throws CONFLICT AppError (FK constraint)", async () => {
    // Arrange
    mockService.delete.mockRejectedValue(
      new AppError(
        "Cannot delete department: one or more users are assigned to it",
        StatusCodes.CONFLICT,
      ),
    );
    const req = mockRequest({ id: "1" });
    const res = mockResponse();

    // Act
    await controller.delete(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.CONFLICT);
  });

  it("returns 500 on unexpected error", async () => {
    // Arrange
    mockService.delete.mockRejectedValue(new Error("DB failure"));
    const req = mockRequest({ id: "1" });
    const res = mockResponse();

    // Act
    await controller.delete(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});
