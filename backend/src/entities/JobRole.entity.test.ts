import { validate } from "class-validator";
import { JobRole } from "./JobRole.entity";

describe("JobRole entity tests", () => {
  it("A blank name is considered invalid", async () => {
    // Arrange
    const jobRole = new JobRole();
    jobRole.name = "";

    // Act
    const errors = await validate(jobRole);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty("isNotEmpty");
  });

  it("A name containing only spaces is considered invalid", async () => {
    // Arrange
    const jobRole = new JobRole();
    jobRole.name = "   ";

    // Act
    const errors = await validate(jobRole);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty("matches");
  });

  it("A name exceeding 30 characters is considered invalid", async () => {
    // Arrange
    const jobRole = new JobRole();
    jobRole.name = "a".repeat(31);

    // Act
    const errors = await validate(jobRole);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty("maxLength");
  });

  it("A valid name will be accepted", async () => {
    // Arrange
    const jobRole = new JobRole();
    jobRole.name = "Senior Contractor";

    // Act
    const errors = await validate(jobRole);

    // Assert
    expect(errors.length).toBe(0);
  });
});
