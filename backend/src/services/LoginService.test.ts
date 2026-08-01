import { StatusCodes } from "http-status-codes";
import { mock, MockProxy } from "jest-mock-extended";
import type { Repository, SelectQueryBuilder } from "typeorm";
import { User } from "../entities/User.entity";
import { AppError } from "../helpers/AppError";
import { PasswordHandler } from "../helpers/PasswordHandler";
import { makeUser } from "../test/ObjectMother";
import { TEST_JWT_SECRET } from "../test/testConfig";
import { LoginService } from "./LoginService";

jest.mock("jsonwebtoken", () => ({ sign: jest.fn(() => "mocked.jwt.token") }));

let mockRepo: MockProxy<Repository<User>>;
let service: LoginService;

beforeEach(() => {
  mockRepo = mock<Repository<User>>();
  service = new LoginService(mockRepo);
  process.env.JWT_SECRET_KEY = TEST_JWT_SECRET;
  jest.clearAllMocks();
});

describe("LoginService.login", () => {
  it("throws BAD_REQUEST when email or password is missing", async () => {
    // Arrange - no setup needed

    // Act & Assert
    await expect(service.login("", "Password123!")).rejects.toThrow(
      new AppError("Email and password are required", StatusCodes.BAD_REQUEST),
    );
  });

  it("throws UNAUTHORIZED when user is not found", async () => {
    // Arrange
    const mockQB = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    } as unknown as SelectQueryBuilder<User>;
    mockRepo.createQueryBuilder.mockReturnValue(mockQB);

    // Act & Assert
    await expect(
      service.login("nobody@company.com", "Password123!"),
    ).rejects.toThrow(new AppError("User not found", StatusCodes.UNAUTHORIZED));
  });

  it("throws UNAUTHORIZED when password is incorrect", async () => {
    // Arrange
    const user = makeUser({ password: "hashed", salt: "somesalt" });
    const mockQB = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    } as unknown as SelectQueryBuilder<User>;
    mockRepo.createQueryBuilder.mockReturnValue(mockQB);
    jest.spyOn(PasswordHandler, "verifyPassword").mockReturnValue(false);

    // Act & Assert
    await expect(service.login("alice@company.com", "wrong")).rejects.toThrow(
      new AppError("Incorrect password", StatusCodes.UNAUTHORIZED),
    );
  });

  it("returns a signed JWT token on successful login", async () => {
    // Arrange
    const user = makeUser();
    const mockQB = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    } as unknown as SelectQueryBuilder<User>;
    mockRepo.createQueryBuilder.mockReturnValue(mockQB);
    jest.spyOn(PasswordHandler, "verifyPassword").mockReturnValue(true);

    // Act
    const token = await service.login("alice@company.com", "Password123!");

    // Assert
    expect(token).toBe("mocked.jwt.token");
  });
});
