import { validate } from "class-validator";
import { User } from "./User.entity";
import { RoleType } from "../enums/RoleType.enum";

function makeValidUser(): User {
  const user = new User();
  user.firstName = "Alice";
  user.lastName = "Johnson";
  user.email = "alice@company.com";
  user.password = "Password123!";
  user.role = RoleType.Employee;
  user.annualLeaveAllowance = 25;
  user.departmentId = 1;
  user.jobRoleId = 1;
  return user;
}

describe("User entity tests", () => {
  it("a valid user passes validation", async () => {
    // Arrange
    const user = makeValidUser();

    // Act
    const errors = await validate(user);

    // Assert
    expect(errors.length).toBe(0);
  });

  it("a blank firstName is considered invalid", async () => {
    // Arrange
    const user = makeValidUser();
    user.firstName = "";

    // Act
    const errors = await validate(user);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty("isNotEmpty");
  });

  it("a blank lastName is considered invalid", async () => {
    // Arrange
    const user = makeValidUser();
    user.lastName = "";

    // Act
    const errors = await validate(user);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty("isNotEmpty");
  });

  it("an invalid email format is considered invalid", async () => {
    // Arrange
    const user = makeValidUser();
    user.email = "not-an-email";

    // Act
    const errors = await validate(user);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty("isEmail");
  });

  it("an invalid role enum value is considered invalid", async () => {
    // Arrange
    const user = makeValidUser();
    user.role = "SuperAdmin" as RoleType;

    // Act
    const errors = await validate(user);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty("isEnum");
  });

  it("a negative annualLeaveAllowance is considered invalid", async () => {
    // Arrange
    const user = makeValidUser();
    user.annualLeaveAllowance = -5;

    // Act
    const errors = await validate(user);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty("isPositive");
  });
});
