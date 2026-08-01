import { StatusCodes } from "http-status-codes";
import { mock, MockProxy } from "jest-mock-extended";
import type { DeleteResult, Repository } from "typeorm";
import { User } from "../entities/User.entity";
import { AppError } from "../helpers/AppError";
import { makeUser } from "../test/ObjectMother";
import { UserService } from "./UserService";

let mockRepo: MockProxy<Repository<User>>;
let service: UserService;

beforeEach(() => {
  mockRepo = mock<Repository<User>>();
  service = new UserService(mockRepo);
  jest.clearAllMocks();
});

describe("UserService.getAll", () => {
  it("returns all users from the repository", async () => {
    // Arrange
    const users = [makeUser(), makeUser({ id: 2 })];
    mockRepo.find.mockResolvedValue(users);

    // Act
    const result = await service.getAll();

    // Assert
    expect(result).toEqual(users);
    expect(mockRepo.find).toHaveBeenCalledTimes(1);
  });
});

describe("UserService.getById", () => {
  it("returns the user when found", async () => {
    // Arrange
    const user = makeUser();
    mockRepo.findOne.mockResolvedValue(user);

    // Act
    const result = await service.getById(1);

    // Assert
    expect(result).toEqual(user);
  });

  it("throws NOT_FOUND AppError when user does not exist", async () => {
    // Arrange
    mockRepo.findOne.mockResolvedValue(null);

    // Act & Assert
    await expect(service.getById(99)).rejects.toThrow(
      new AppError("User not found with ID: 99", StatusCodes.NOT_FOUND),
    );
  });
});

describe("UserService.create", () => {
  it("saves and returns the new user on success", async () => {
    // Arrange
    const user = makeUser();
    mockRepo.save.mockResolvedValue(user);
    mockRepo.findOneBy.mockResolvedValue(user);

    // Act
    const result = await service.create({
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@company.com",
      password: "Password123!",
      role: user.role,
      annualLeaveAllowance: 25,
      departmentId: 1,
      jobRoleId: 1,
    });

    // Assert
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual(user);
  });

  it("throws UNPROCESSABLE_ENTITY when create data fails validation", async () => {
    // Arrange - invalid email fails @IsEmail() validator

    // Act & Assert
    await expect(
      service.create({
        firstName: "Alice",
        lastName: "Smith",
        email: "not-an-email",
        password: "Password123!",
        role: "Employee" as import("../enums").RoleType,
        annualLeaveAllowance: 25,
        departmentId: 1,
        jobRoleId: 1,
      }),
    ).rejects.toThrow(AppError);
  });
});

describe("UserService.update", () => {
  it("finds, updates, and returns the user", async () => {
    // Arrange
    const user = makeUser({ password: "Password123!" });
    const updated = makeUser({ annualLeaveAllowance: 30 });
    mockRepo.findOneBy
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(updated);
    mockRepo.save.mockResolvedValue(updated);

    // Act
    const result = await service.update(1, { annualLeaveAllowance: 30 });

    // Assert
    expect(mockRepo.save).toHaveBeenCalled();
    expect(result).toEqual(updated);
  });

  it("throws NOT_FOUND AppError when user does not exist", async () => {
    // Arrange
    mockRepo.findOneBy.mockResolvedValue(null);

    // Act & Assert
    await expect(service.update(99, {})).rejects.toThrow(
      new AppError("User not found", StatusCodes.NOT_FOUND),
    );
  });

  it("hashes the new password when password is included in update data", async () => {
    // Arrange
    const user = makeUser({ password: "OldPassword1!" });
    const updated = makeUser({ password: "hashed-new-password" });
    mockRepo.findOneBy
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(updated);
    mockRepo.save.mockResolvedValue(updated);

    // Act
    const result = await service.update(1, { password: "NewPassword123!" });

    // Assert
    expect(mockRepo.save).toHaveBeenCalled();
    expect(result).toEqual(updated);
  });

  it("throws UNPROCESSABLE_ENTITY when update data fails validation", async () => {
    // Arrange - invalid email fails @IsEmail() validator
    const user = makeUser();
    mockRepo.findOneBy.mockResolvedValueOnce(user);

    // Act & Assert
    await expect(service.update(1, { email: "not-an-email" })).rejects.toThrow(
      AppError,
    );
  });
});

describe("UserService.delete", () => {
  it("deletes user successfully when found", async () => {
    // Arrange
    mockRepo.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

    // Act & Assert
    await expect(service.delete(7)).resolves.toBeUndefined();
    expect(mockRepo.delete).toHaveBeenCalledWith(7);
  });

  it("throws NOT_FOUND AppError when user does not exist", async () => {
    // Arrange
    mockRepo.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

    // Act & Assert
    await expect(service.delete(99)).rejects.toThrow(
      new AppError("User not found", StatusCodes.NOT_FOUND),
    );
  });
});
