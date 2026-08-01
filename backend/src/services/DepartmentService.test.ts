import { StatusCodes } from "http-status-codes";
import { mock, MockProxy } from "jest-mock-extended";
import type { DeleteResult, Repository } from "typeorm";
import { Department } from "../entities/Department.entity";
import { AppError } from "../helpers/AppError";
import { makeDepartment } from "../test/ObjectMother";
import { DepartmentService } from "./DepartmentService";

let mockRepo: MockProxy<Repository<Department>>;
let service: DepartmentService;

beforeEach(() => {
  mockRepo = mock<Repository<Department>>();
  service = new DepartmentService(mockRepo);
  jest.clearAllMocks();
});

describe("DepartmentService.getAll", () => {
  it("returns all departments from the repository", async () => {
    // Arrange
    const depts = [
      makeDepartment(),
      makeDepartment({ id: 2, name: "Finance" }),
    ];
    mockRepo.find.mockResolvedValue(depts);

    // Act
    const result = await service.getAll();

    // Assert
    expect(result).toEqual(depts);
  });
});

describe("DepartmentService.getById", () => {
  it("returns the department when found", async () => {
    // Arrange
    const dept = makeDepartment();
    mockRepo.findOne.mockResolvedValue(dept);

    // Act
    const result = await service.getById(1);

    // Assert
    expect(result).toEqual(dept);
  });

  it("throws NOT_FOUND AppError when department does not exist", async () => {
    // Arrange
    mockRepo.findOne.mockResolvedValue(null);

    // Act & Assert
    await expect(service.getById(99)).rejects.toThrow(
      new AppError("Department not found with ID: 99", StatusCodes.NOT_FOUND),
    );
  });
});

describe("DepartmentService.create", () => {
  it("saves and returns the new department", async () => {
    // Arrange
    const dept = makeDepartment({ name: "Legal" });
    mockRepo.save.mockResolvedValue(dept);

    // Act
    const result = await service.create("Legal");

    // Assert
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(result.name).toBe("Legal");
  });

  it("throws UNPROCESSABLE_ENTITY when name is empty", async () => {
    // Arrange - empty name triggers class-validator

    // Act & Assert
    await expect(service.create("")).rejects.toThrow(AppError);
  });
});

describe("DepartmentService.update", () => {
  it("updates and returns the department", async () => {
    // Arrange
    const existing = makeDepartment();
    const updated = makeDepartment({ name: "Software Engineering" });
    mockRepo.findOneBy.mockResolvedValue(existing);
    mockRepo.save.mockResolvedValue(updated);

    // Act
    const result = await service.update(1, "Software Engineering");

    // Assert
    expect(result.name).toBe("Software Engineering");
  });

  it("throws NOT_FOUND AppError when department does not exist", async () => {
    // Arrange
    mockRepo.findOneBy.mockResolvedValue(null);

    // Act & Assert
    await expect(service.update(99, "New Name")).rejects.toThrow(
      new AppError("Department not found", StatusCodes.NOT_FOUND),
    );
  });

  it("throws UNPROCESSABLE_ENTITY when updated name is empty", async () => {
    // Arrange
    const existing = makeDepartment();
    mockRepo.findOneBy.mockResolvedValue(existing);

    // Act & Assert
    await expect(service.update(1, "")).rejects.toThrow(AppError);
  });
});

describe("DepartmentService.delete", () => {
  it("deletes department successfully when found", async () => {
    // Arrange
    mockRepo.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

    // Act & Assert
    await expect(service.delete(5)).resolves.toBeUndefined();
  });

  it("throws NOT_FOUND AppError when department does not exist", async () => {
    // Arrange
    mockRepo.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

    // Act & Assert
    await expect(service.delete(99)).rejects.toThrow(
      new AppError("Department not found", StatusCodes.NOT_FOUND),
    );
  });

  it("throws CONFLICT AppError on foreign key constraint violation", async () => {
    // Arrange
    mockRepo.delete.mockRejectedValue(
      new Error("foreign key constraint fails"),
    );

    // Act & Assert
    await expect(service.delete(1)).rejects.toThrow(
      new AppError(
        "Cannot delete department: one or more users are assigned to it",
        StatusCodes.CONFLICT,
      ),
    );
  });

  it("rethrows unknown errors that are not AppError or FK violations", async () => {
    // Arrange
    const unknownError = new Error("unexpected storage error");
    mockRepo.delete.mockRejectedValue(unknownError);

    // Act & Assert
    await expect(service.delete(1)).rejects.toThrow(unknownError);
  });
});
