import { StatusCodes } from "http-status-codes";
import { mock, MockProxy } from "jest-mock-extended";
import type { DeleteResult, Repository } from "typeorm";
import { PublicHoliday } from "../entities/PublicHoliday.entity";
import { AppError } from "../helpers/AppError";
import { makePublicHoliday } from "../test/ObjectMother";
import { PublicHolidayService } from "./PublicHolidayService";

let mockRepo: MockProxy<Repository<PublicHoliday>>;
let service: PublicHolidayService;

beforeEach(() => {
  mockRepo = mock<Repository<PublicHoliday>>();
  service = new PublicHolidayService(mockRepo);
  jest.clearAllMocks();
});

describe("PublicHolidayService.getAll", () => {
  it("returns all holidays ordered by date", async () => {
    // Arrange
    const holidays = [
      makePublicHoliday({ id: 1, name: "Christmas Day" }),
      makePublicHoliday({
        id: 2,
        name: "New Year",
        date: new Date("2027-01-01"),
      }),
    ];
    mockRepo.find.mockResolvedValue(holidays);

    // Act
    const result = await service.getAll();

    // Assert
    expect(result).toEqual(holidays);
    expect(mockRepo.find).toHaveBeenCalledWith({ order: { date: "ASC" } });
  });
});

describe("PublicHolidayService.getById", () => {
  it("returns the holiday when found", async () => {
    // Arrange
    const holiday = makePublicHoliday();
    mockRepo.findOne.mockResolvedValue(holiday);

    // Act
    const result = await service.getById(1);

    // Assert
    expect(result).toEqual(holiday);
    expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("throws NOT_FOUND AppError when holiday does not exist", async () => {
    // Arrange
    mockRepo.findOne.mockResolvedValue(null);

    // Act & Assert
    await expect(service.getById(99)).rejects.toThrow(
      new AppError(
        "Public holiday not found with ID: 99",
        StatusCodes.NOT_FOUND,
      ),
    );
  });
});

describe("PublicHolidayService.create", () => {
  it("saves and returns the new holiday on valid input", async () => {
    // Arrange
    const holiday = makePublicHoliday();
    mockRepo.save.mockResolvedValue(holiday);

    // Act
    const result = await service.create("2026-12-25", "Christmas Day");

    // Assert
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(result.name).toBe("Christmas Day");
  });

  it("throws BAD_REQUEST when date string is not a valid date", async () => {
    // Arrange - "not-a-date" produces NaN from Date constructor

    // Act & Assert
    await expect(service.create("not-a-date", "Christmas Day")).rejects.toThrow(
      new AppError("Invalid date format", StatusCodes.BAD_REQUEST),
    );
  });

  it("throws UNPROCESSABLE_ENTITY when name is empty", async () => {
    // Arrange - empty name fails @IsNotEmpty() validator

    // Act & Assert
    await expect(service.create("2026-12-25", "")).rejects.toThrow(AppError);
  });
});

describe("PublicHolidayService.update", () => {
  it("updates the date and returns the saved holiday", async () => {
    // Arrange
    const existing = makePublicHoliday();
    const updated = makePublicHoliday({ date: new Date("2027-01-01") });
    mockRepo.findOneBy.mockResolvedValue(existing);
    mockRepo.save.mockResolvedValue(updated);

    // Act
    const result = await service.update(1, { date: "2027-01-01" });

    // Assert
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(result.date).toEqual(new Date("2027-01-01"));
  });

  it("updates the name and returns the saved holiday", async () => {
    // Arrange
    const existing = makePublicHoliday();
    const updated = makePublicHoliday({ name: "Boxing Day" });
    mockRepo.findOneBy.mockResolvedValue(existing);
    mockRepo.save.mockResolvedValue(updated);

    // Act
    const result = await service.update(1, { name: "Boxing Day" });

    // Assert
    expect(result.name).toBe("Boxing Day");
  });

  it("throws NOT_FOUND AppError when holiday does not exist", async () => {
    // Arrange
    mockRepo.findOneBy.mockResolvedValue(null);

    // Act & Assert
    await expect(service.update(99, { name: "Boxing Day" })).rejects.toThrow(
      new AppError("Public holiday not found", StatusCodes.NOT_FOUND),
    );
  });

  it("throws BAD_REQUEST when updated date string is invalid", async () => {
    // Arrange
    mockRepo.findOneBy.mockResolvedValue(makePublicHoliday());

    // Act & Assert
    await expect(service.update(1, { date: "not-a-date" })).rejects.toThrow(
      new AppError("Invalid date format", StatusCodes.BAD_REQUEST),
    );
  });

  it("throws UNPROCESSABLE_ENTITY when updated name is empty", async () => {
    // Arrange - empty name fails @IsNotEmpty() on the entity
    mockRepo.findOneBy.mockResolvedValue(makePublicHoliday());

    // Act & Assert
    await expect(service.update(1, { name: "" })).rejects.toThrow(AppError);
  });
});

describe("PublicHolidayService.delete", () => {
  it("deletes holiday successfully when found", async () => {
    // Arrange
    mockRepo.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

    // Act & Assert
    await expect(service.delete(1)).resolves.toBeUndefined();
    expect(mockRepo.delete).toHaveBeenCalledWith(1);
  });

  it("throws NOT_FOUND AppError when holiday does not exist", async () => {
    // Arrange
    mockRepo.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

    // Act & Assert
    await expect(service.delete(99)).rejects.toThrow(
      new AppError("Public holiday not found", StatusCodes.NOT_FOUND),
    );
  });
});
