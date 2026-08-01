import { mock, MockProxy } from "jest-mock-extended";
import { StatusCodes } from "http-status-codes";
import { PublicHolidayController } from "./PublicHolidayController";
import { AppError } from "../helpers/AppError";
import type { IPublicHolidayService } from "../types/IPublicHolidayService";
import {
  makePublicHoliday,
  mockRequest,
  mockResponse,
} from "../test/ObjectMother";

let mockService: MockProxy<IPublicHolidayService>;
let controller: PublicHolidayController;

beforeEach(() => {
  mockService = mock<IPublicHolidayService>();
  controller = new PublicHolidayController(mockService);
  jest.clearAllMocks();
});

describe("PublicHolidayController.getAll", () => {
  it("returns 200 with holidays when service returns results", async () => {
    // Arrange
    mockService.getAll.mockResolvedValue([makePublicHoliday()]);
    const req = mockRequest();
    const res = mockResponse();

    // Act
    await controller.getAll(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
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

describe("PublicHolidayController.getById", () => {
  it("returns 400 for non-numeric id", async () => {
    // Arrange
    const req = mockRequest({ id: "abc" });
    const res = mockResponse();

    // Act
    await controller.getById(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("returns 200 with holiday from service", async () => {
    // Arrange
    mockService.getById.mockResolvedValue(makePublicHoliday());
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
      new AppError(
        "Public holiday not found with ID: 99",
        StatusCodes.NOT_FOUND,
      ),
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

describe("PublicHolidayController.create", () => {
  it("returns 400 when date or name is missing", async () => {
    // Arrange
    const req = mockRequest({}, { date: "2026-12-25" }); // name omitted
    const res = mockResponse();

    // Act
    await controller.create(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("returns 201 with created holiday on success", async () => {
    // Arrange
    const holiday = makePublicHoliday();
    mockService.create.mockResolvedValue(holiday);
    const req = mockRequest({}, { date: "2026-12-25", name: "Christmas Day" });
    const res = mockResponse();

    // Act
    await controller.create(req, res);

    // Assert
    expect(mockService.create).toHaveBeenCalledWith(
      "2026-12-25",
      "Christmas Day",
    );
    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
  });

  it("returns 400 when service throws AppError", async () => {
    // Arrange
    mockService.create.mockRejectedValue(
      new AppError("Invalid date format", StatusCodes.BAD_REQUEST),
    );
    const req = mockRequest({}, { date: "not-a-date", name: "Christmas Day" });
    const res = mockResponse();

    // Act
    await controller.create(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("returns 500 on unexpected error", async () => {
    // Arrange
    mockService.create.mockRejectedValue(new Error("DB failure"));
    const req = mockRequest({}, { date: "2026-12-25", name: "Christmas Day" });
    const res = mockResponse();

    // Act
    await controller.create(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});

describe("PublicHolidayController.update", () => {
  it("returns 400 for non-numeric id", async () => {
    // Arrange
    const req = mockRequest({ id: "xyz" });
    const res = mockResponse();

    // Act
    await controller.update(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("returns 200 with updated holiday on success", async () => {
    // Arrange
    const holiday = makePublicHoliday({ name: "Boxing Day" });
    mockService.update.mockResolvedValue(holiday);
    const req = mockRequest({ id: "1" }, { name: "Boxing Day" });
    const res = mockResponse();

    // Act
    await controller.update(req, res);

    // Assert
    expect(mockService.update).toHaveBeenCalledWith(1, { name: "Boxing Day" });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 404 when service throws NOT_FOUND AppError", async () => {
    // Arrange
    mockService.update.mockRejectedValue(
      new AppError("Public holiday not found", StatusCodes.NOT_FOUND),
    );
    const req = mockRequest({ id: "99" }, { name: "Boxing Day" });
    const res = mockResponse();

    // Act
    await controller.update(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
  });

  it("returns 500 on unexpected error", async () => {
    // Arrange
    mockService.update.mockRejectedValue(new Error("DB failure"));
    const req = mockRequest({ id: "1" }, { name: "Boxing Day" });
    const res = mockResponse();

    // Act
    await controller.update(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});

describe("PublicHolidayController.delete", () => {
  it("returns 400 for non-numeric id", async () => {
    // Arrange
    const req = mockRequest({ id: "abc" });
    const res = mockResponse();

    // Act
    await controller.delete(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("returns 204 when holiday is deleted successfully", async () => {
    // Arrange
    mockService.delete.mockResolvedValue();
    const req = mockRequest({ id: "1" });
    const res = mockResponse();

    // Act
    await controller.delete(req, res);

    // Assert
    expect(mockService.delete).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(StatusCodes.NO_CONTENT);
  });

  it("returns 404 when service throws NOT_FOUND AppError", async () => {
    // Arrange
    mockService.delete.mockRejectedValue(
      new AppError("Public holiday not found", StatusCodes.NOT_FOUND),
    );
    const req = mockRequest({ id: "99" });
    const res = mockResponse();

    // Act
    await controller.delete(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
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
