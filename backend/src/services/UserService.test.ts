import { StatusCodes } from "http-status-codes";
import { mock, MockProxy } from "jest-mock-extended";
import type { DeleteResult, Repository } from "typeorm";
import { User } from "../entities/User.entity";
import { RoleType } from "../enums/index";
import { AppError } from "../helpers/AppError";
import { makeDepartment, makeJobRole, makeUser } from "../test/ObjectMother";
import { DUPLICATE_EMAIL_ERROR, UserService } from "./UserService";

let mockRepo: MockProxy<Repository<User>>;
let service: UserService;

beforeEach(() => {
  mockRepo = mock<Repository<User>>();
  service = new UserService(mockRepo);
  jest.clearAllMocks();
});

describe("UserService.getAll", () => {
  const engineering = makeDepartment({ id: 3, name: "Engineering" });
  const contractor = makeJobRole({ id: 4, name: "Contractor" });

  it("returns one list item per user with the relation names resolved", async () => {
    // Arrange
    const manager = makeUser({
      id: 2,
      firstName: "Bob",
      lastName: "Mitchell",
      department: engineering,
      jobRole: contractor,
    });
    mockRepo.find.mockResolvedValue([
      makeUser({
        id: 1,
        department: engineering,
        jobRole: contractor,
        manager,
        managerId: manager.id,
      }),
      manager,
    ]);

    // Act
    const result = await service.getAll();

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 1,
      department: { id: 3, name: "Engineering" },
      jobRole: { id: 4, name: "Contractor" },
      manager: { id: 2, name: "Bob Mitchell" },
    });
    expect(mockRepo.find).toHaveBeenCalledTimes(1);
  });

  it("loads the department, job role and manager relations", async () => {
    // Arrange
    mockRepo.find.mockResolvedValue([]);

    // Act
    await service.getAll();

    // Assert
    expect(mockRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: { department: true, jobRole: true, manager: true },
      }),
    );
  });

  it("reports a user without a line manager as null rather than omitting them", async () => {
    // Arrange
    mockRepo.find.mockResolvedValue([
      makeUser({
        department: engineering,
        jobRole: contractor,
        manager: null,
        managerId: null,
      }),
    ]);

    // Act
    const result = await service.getAll();

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]!.manager).toBeNull();
  });

  it("never exposes the password or salt", async () => {
    // Arrange
    mockRepo.find.mockResolvedValue([
      makeUser({
        department: engineering,
        jobRole: contractor,
        password: "hashed-secret",
        salt: "secret-salt",
      }),
    ]);

    // Act
    const result = await service.getAll();

    // Assert
    expect(JSON.stringify(result)).not.toContain("hashed-secret");
    expect(JSON.stringify(result)).not.toContain("secret-salt");
    expect(result[0]).not.toHaveProperty("password");
    expect(result[0]).not.toHaveProperty("salt");
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

describe("UserService.getOwnProfile", () => {
  it("populates department and jobRole as objects rather than bare IDs", async () => {
    // Arrange
    const user = makeUser({
      department: makeDepartment(),
      jobRole: makeJobRole(),
    });
    mockRepo.findOne.mockResolvedValue(user);

    // Act
    const result = await service.getOwnProfile(1);

    // Assert
    expect(result.department).toEqual({ id: 1, name: "Engineering" });
    expect(result.jobRole).toEqual({ id: 1, name: "Contractor" });
  });

  it("requests the department and jobRole relations from the repository", async () => {
    // Arrange
    mockRepo.findOne.mockResolvedValue(
      makeUser({ department: makeDepartment(), jobRole: makeJobRole() }),
    );

    // Act
    await service.getOwnProfile(1);

    // Assert
    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      relations: { department: true, jobRole: true },
    });
  });

  it("returns the profile fields the caller needs", async () => {
    // Arrange
    mockRepo.findOne.mockResolvedValue(
      makeUser({ department: makeDepartment(), jobRole: makeJobRole() }),
    );

    // Act
    const result = await service.getOwnProfile(1);

    // Assert
    expect(result).toEqual({
      id: 1,
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@company.com",
      role: RoleType.Employee,
      annualLeaveAllowance: 25,
      department: { id: 1, name: "Engineering" },
      jobRole: { id: 1, name: "Contractor" },
    });
  });

  it("omits password and salt even when the entity carries them", async () => {
    // Arrange
    const user = makeUser({
      password: "hashed",
      salt: "somesalt",
      department: makeDepartment(),
      jobRole: makeJobRole(),
    });
    mockRepo.findOne.mockResolvedValue(user);

    // Act
    const result = await service.getOwnProfile(1);

    // Assert
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("salt");
  });

  it("throws NOT_FOUND AppError when user does not exist", async () => {
    // Arrange
    mockRepo.findOne.mockResolvedValue(null);

    // Act & Assert
    await expect(service.getOwnProfile(99)).rejects.toThrow(
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

  it("translates a duplicate email into a readable CONFLICT rather than a driver error", async () => {
    // Arrange - the email column is unique, so MySQL answers with ER_DUP_ENTRY
    mockRepo.save.mockRejectedValue(
      Object.assign(
        new Error("Duplicate entry 'alice@company.com' for key 'IDX_97'"),
        { code: "ER_DUP_ENTRY", errno: 1062 },
      ),
    );

    // Act
    const failure = service.create({
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@company.com",
      password: "Password123!",
      role: RoleType.Employee,
      annualLeaveAllowance: 25,
      departmentId: 1,
      jobRoleId: 1,
    });

    // Assert
    await expect(failure).rejects.toThrow(
      new AppError(DUPLICATE_EMAIL_ERROR, StatusCodes.CONFLICT),
    );
    await expect(failure).rejects.toMatchObject({
      statusCode: StatusCodes.CONFLICT,
    });
  });

  it("lets any other save failure through untouched", async () => {
    // Arrange
    mockRepo.save.mockRejectedValue(new Error("Connection lost"));

    // Act & Assert
    await expect(
      service.create({
        firstName: "Alice",
        lastName: "Smith",
        email: "alice@company.com",
        password: "Password123!",
        role: RoleType.Employee,
        annualLeaveAllowance: 25,
        departmentId: 1,
        jobRoleId: 1,
      }),
    ).rejects.toThrow("Connection lost");
  });
});

describe("UserService.update", () => {
  it("translates a duplicate email into a readable CONFLICT", async () => {
    // Arrange
    mockRepo.findOneBy.mockResolvedValue(
      makeUser({ password: "Password123!" }),
    );
    mockRepo.save.mockRejectedValue(
      Object.assign(new Error("Duplicate entry"), {
        driverError: { code: "ER_DUP_ENTRY", errno: 1062 },
      }),
    );

    // Act & Assert
    await expect(
      service.update(1, { email: "taken@company.com" }),
    ).rejects.toThrow(
      new AppError(DUPLICATE_EMAIL_ERROR, StatusCodes.CONFLICT),
    );
  });

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
