import { StatusCodes } from "http-status-codes";
import { mock, MockProxy } from "jest-mock-extended";
import type { DeleteResult, Repository } from "typeorm";
import { JobRole } from "../entities/JobRole.entity";
import { AppError } from "../helpers/AppError";
import { makeJobRole } from "../test/ObjectMother";
import { JobRoleService } from "./JobRoleService";

let mockRepo: MockProxy<Repository<JobRole>>;
let service: JobRoleService;

beforeEach(() => {
  mockRepo = mock<Repository<JobRole>>();
  service = new JobRoleService(mockRepo);
  jest.clearAllMocks();
});

describe("JobRoleService.getAll", () => {
  it("returns all job roles from the repository", async () => {
    // Arrange
    const jobRoles = [
      makeJobRole(),
      makeJobRole({ id: 2, name: "Senior Contractor" }),
    ];
    mockRepo.find.mockResolvedValue(jobRoles);

    // Act
    const result = await service.getAll();

    // Assert
    expect(result).toEqual(jobRoles);
  });
});

describe("JobRoleService.getById", () => {
  it("returns the job role when found", async () => {
    // Arrange
    const jobRole = makeJobRole();
    mockRepo.findOne.mockResolvedValue(jobRole);

    // Act
    const result = await service.getById(1);

    // Assert
    expect(result).toEqual(jobRole);
  });

  it("throws NOT_FOUND AppError when job role does not exist", async () => {
    // Arrange
    mockRepo.findOne.mockResolvedValue(null);

    // Act & Assert
    await expect(service.getById(99)).rejects.toThrow(
      new AppError("Job role not found with ID: 99", StatusCodes.NOT_FOUND),
    );
  });
});

describe("JobRoleService.create", () => {
  it("saves and returns the new job role", async () => {
    // Arrange
    const jobRole = makeJobRole({ name: "Lead Engineer" });
    mockRepo.save.mockResolvedValue(jobRole);

    // Act
    const result = await service.create("Lead Engineer");

    // Assert
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(result.name).toBe("Lead Engineer");
  });

  it("throws UNPROCESSABLE_ENTITY when name is empty", async () => {
    // Arrange - empty name triggers class-validator

    // Act & Assert
    await expect(service.create("")).rejects.toThrow(AppError);
  });
});

describe("JobRoleService.update", () => {
  it("updates and returns the job role", async () => {
    // Arrange
    const existing = makeJobRole();
    const updated = makeJobRole({ name: "Principal Engineer" });
    mockRepo.findOneBy.mockResolvedValue(existing);
    mockRepo.save.mockResolvedValue(updated);

    // Act
    const result = await service.update(1, "Principal Engineer");

    // Assert
    expect(result.name).toBe("Principal Engineer");
  });

  it("throws NOT_FOUND AppError when job role does not exist", async () => {
    // Arrange
    mockRepo.findOneBy.mockResolvedValue(null);

    // Act & Assert
    await expect(service.update(99, "New Name")).rejects.toThrow(
      new AppError("Job role not found", StatusCodes.NOT_FOUND),
    );
  });

  it("throws UNPROCESSABLE_ENTITY when updated name is empty", async () => {
    // Arrange
    const existing = makeJobRole();
    mockRepo.findOneBy.mockResolvedValue(existing);

    // Act & Assert
    await expect(service.update(1, "")).rejects.toThrow(AppError);
  });
});

describe("JobRoleService.delete", () => {
  it("deletes job role successfully when found", async () => {
    // Arrange
    mockRepo.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

    // Act & Assert
    await expect(service.delete(6)).resolves.toBeUndefined();
  });

  it("throws NOT_FOUND AppError when job role does not exist", async () => {
    // Arrange
    mockRepo.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

    // Act & Assert
    await expect(service.delete(99)).rejects.toThrow(
      new AppError("Job role not found", StatusCodes.NOT_FOUND),
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
        "Cannot delete job role: one or more users are assigned to it",
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
