import { validate } from "class-validator";
import { Department } from "./Department.entity";

describe("Department entity tests", () => {
  it("A blank name is considered invalid", async () => {
    // Arrange
    const dept = new Department();
    dept.name = "";

    // Act
    const errors = await validate(dept);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty("isNotEmpty");
  });

  it("A name exceeding 100 characters is considered invalid", async () => {
    // Arrange
    const dept = new Department();
    dept.name = "a".repeat(101);

    // Act
    const errors = await validate(dept);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty("maxLength");
  });

  it("A valid name will be accepted", async () => {
    // Arrange
    const dept = new Department();
    dept.name = "Engineering";

    // Act
    const errors = await validate(dept);

    // Assert
    expect(errors.length).toBe(0);
  });
});
