import { validate } from "class-validator";
import { LeaveRequest } from "./LeaveRequest.entity";
import { LeaveStatus, LeaveType } from "../enums/index";

function makeValidLeaveRequest(): LeaveRequest {
  const lr = new LeaveRequest();
  lr.startDate = new Date("2026-05-01");
  lr.endDate = new Date("2026-05-05");
  lr.daysRequested = 5;
  lr.leaveType = LeaveType.Vacation;
  lr.status = LeaveStatus.Pending;
  lr.reason = null;
  lr.userId = 1;
  lr.reviewedById = null;
  lr.managerNote = null;
  return lr;
}

describe("LeaveRequest entity tests", () => {
  it("a valid leave request passes validation", async () => {
    // Arrange
    const lr = makeValidLeaveRequest();

    // Act
    const errors = await validate(lr);

    // Assert
    expect(errors.length).toBe(0);
  });

  it("a zero daysRequested is considered invalid", async () => {
    // Arrange
    const lr = makeValidLeaveRequest();
    lr.daysRequested = 0;

    // Act
    const errors = await validate(lr);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty("isPositive");
  });

  it("a negative daysRequested is considered invalid", async () => {
    // Arrange
    const lr = makeValidLeaveRequest();
    lr.daysRequested = -3;

    // Act
    const errors = await validate(lr);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty("isPositive");
  });

  it("an invalid leaveType enum value is considered invalid", async () => {
    // Arrange
    const lr = makeValidLeaveRequest();
    lr.leaveType = "InvalidType" as LeaveType;

    // Act
    const errors = await validate(lr);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty("isEnum");
  });

  it("an invalid status enum value is considered invalid", async () => {
    // Arrange
    const lr = makeValidLeaveRequest();
    lr.status = "InvalidStatus" as LeaveStatus;

    // Act
    const errors = await validate(lr);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty("isEnum");
  });
});
