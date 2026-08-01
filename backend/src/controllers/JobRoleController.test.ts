import { mock, MockProxy } from "jest-mock-extended";
import { StatusCodes } from "http-status-codes";
import { JobRoleController } from "./JobRoleController";
import { AppError } from "../helpers/AppError";
import type { IJobRoleService } from "../types/IJobRoleService";
import { makeJobRole, mockRequest, mockResponse } from "../test/ObjectMother";

let mockService: MockProxy<IJobRoleService>;
let controller: JobRoleController;

beforeEach(() => {
  mockService = mock<IJobRoleService>();
  controller = new JobRoleController(mockService);
  jest.clearAllMocks();
});

describe("JobRoleController.getAll", () => {
  it("returns 200 with job roles when service returns results", async () => {
    // Arrange
    mockService.getAll.mockResolvedValue([makeJobRole()]);
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

describe("JobRoleController.getById", () => {
  it("returns 400 for non-numeric id", async () => {
    // Arrange
    const req = mockRequest({ id: "abc" });
    const res = mockResponse();

    // Act
    await controller.getById(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("returns 200 with job role from service", async () => {
    // Arrange
    mockService.getById.mockResolvedValue(makeJobRole());
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
      new AppError("Job role not found with ID: 99", StatusCodes.NOT_FOUND),
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

describe("JobRoleController.create", () => {
  it("returns 201 with created job role on success", async () => {
    // Arrange
    mockService.create.mockResolvedValue(
      makeJobRole({ name: "Lead Engineer" }),
    );
    const req = mockRequest({}, { name: "Lead Engineer" });
    const res = mockResponse();

    // Act
    await controller.create(req, res);

    // Assert
    expect(mockService.create).toHaveBeenCalledWith("Lead Engineer");
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

describe("JobRoleController.update", () => {
  it("returns 400 for non-numeric id", async () => {
    // Arrange
    const req = mockRequest({ id: "xyz" });
    const res = mockResponse();

    // Act
    await controller.update(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("returns 200 with updated job role on success", async () => {
    // Arrange
    mockService.update.mockResolvedValue(
      makeJobRole({ name: "Senior Contractor" }),
    );
    const req = mockRequest({ id: "1" }, { name: "Senior Contractor" });
    const res = mockResponse();

    // Act
    await controller.update(req, res);

    // Assert
    expect(mockService.update).toHaveBeenCalledWith(1, "Senior Contractor");
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 404 when service throws NOT_FOUND AppError", async () => {
    // Arrange
    mockService.update.mockRejectedValue(
      new AppError("Job role not found", StatusCodes.NOT_FOUND),
    );
    const req = mockRequest({ id: "99" }, { name: "x" });
    const res = mockResponse();

    // Act
    await controller.update(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
  });
});

describe("JobRoleController.delete", () => {
  it("returns 400 when no id is provided", async () => {
    // Arrange
    const req = mockRequest(); // params empty → req.params.id is undefined
    const res = mockResponse();

    // Act
    await controller.delete(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("returns 200 when job role is deleted successfully", async () => {
    // Arrange
    mockService.delete.mockResolvedValue();
    const req = mockRequest({ id: "6" });
    const res = mockResponse();

    // Act
    await controller.delete(req, res);

    // Assert
    expect(mockService.delete).toHaveBeenCalledWith(6);
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 409 when service throws CONFLICT AppError (FK constraint)", async () => {
    // Arrange
    mockService.delete.mockRejectedValue(
      new AppError(
        "Cannot delete job role: one or more users are assigned to it",
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
