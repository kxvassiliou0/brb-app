import { mock, MockProxy } from "jest-mock-extended";
import { StatusCodes } from "http-status-codes";
import { RoleType } from "../enums/index";
import { LeaveRequestController } from "./LeaveRequestController";
import { AppError } from "../helpers/AppError";
import type { ILeaveRequestService } from "../types/ILeaveRequestService";
import { makeAuthRequest, mockResponse } from "../test/ObjectMother";

let mockService: MockProxy<ILeaveRequestService>;
let controller: LeaveRequestController;

beforeEach(() => {
  mockService = mock<ILeaveRequestService>();
  controller = new LeaveRequestController(mockService);
  jest.clearAllMocks();
});

const successResult = { message: "ok", data: {} };

describe("LeaveRequestController.createLeaveRequest", () => {
  it("returns 201 when service resolves successfully", async () => {
    // Arrange
    mockService.createLeaveRequest.mockResolvedValue(successResult);
    const req = makeAuthRequest({
      body: {
        leave_type: "Vacation",
        start_date: "2026-09-01",
        end_date: "2026-09-05",
      },
    });
    const res = mockResponse();

    // Act
    await controller.createLeaveRequest(req, res);

    // Assert
    expect(mockService.createLeaveRequest).toHaveBeenCalledWith(
      req.signedInUser?.token,
      req.body,
    );
    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    expect(res.json).toHaveBeenCalledWith(successResult);
  });

  it("returns 400 when service throws AppError", async () => {
    // Arrange
    mockService.createLeaveRequest.mockRejectedValue(
      new AppError("Invalid employee ID", StatusCodes.BAD_REQUEST),
    );
    const req = makeAuthRequest({ body: {} });
    const res = mockResponse();

    // Act
    await controller.createLeaveRequest(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("returns 500 on unexpected error", async () => {
    // Arrange
    mockService.createLeaveRequest.mockRejectedValue(new Error("DB failure"));
    const req = makeAuthRequest({ body: {} });
    const res = mockResponse();

    // Act
    await controller.createLeaveRequest(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});

describe("LeaveRequestController.deleteLeaveRequest", () => {
  it("returns 200 when service resolves successfully", async () => {
    // Arrange
    mockService.deleteLeaveRequest.mockResolvedValue(successResult);
    const req = makeAuthRequest({ id: 4, body: { leave_request_id: 2 } });
    const res = mockResponse();

    // Act
    await controller.deleteLeaveRequest(req, res);

    // Assert
    expect(mockService.deleteLeaveRequest).toHaveBeenCalledWith(
      req.signedInUser?.token,
      req.body,
    );
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 403 when service throws FORBIDDEN AppError", async () => {
    // Arrange
    mockService.deleteLeaveRequest.mockRejectedValue(
      new AppError("Unauthorised", StatusCodes.FORBIDDEN),
    );
    const req = makeAuthRequest({ id: 1, body: { leave_request_id: 2 } });
    const res = mockResponse();

    // Act
    await controller.deleteLeaveRequest(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
  });
});

describe("LeaveRequestController.approveLeaveRequest", () => {
  it("returns 200 when service resolves successfully", async () => {
    // Arrange
    mockService.approveLeaveRequest.mockResolvedValue(successResult);
    const req = makeAuthRequest({
      role: RoleType.Manager,
      body: { leave_request_id: 6 },
    });
    const res = mockResponse();

    // Act
    await controller.approveLeaveRequest(req, res);

    // Assert
    expect(mockService.approveLeaveRequest).toHaveBeenCalledWith(
      req.signedInUser?.token,
      req.body,
    );
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 403 when service throws FORBIDDEN AppError", async () => {
    // Arrange
    mockService.approveLeaveRequest.mockRejectedValue(
      new AppError(
        "You can only approve leave requests for your direct reports",
        StatusCodes.FORBIDDEN,
      ),
    );
    const req = makeAuthRequest({
      role: RoleType.Manager,
      body: { leave_request_id: 99 },
    });
    const res = mockResponse();

    // Act
    await controller.approveLeaveRequest(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
  });

  it("returns 500 on unexpected error", async () => {
    // Arrange
    mockService.approveLeaveRequest.mockRejectedValue(new Error("DB failure"));
    const req = makeAuthRequest({ body: {} });
    const res = mockResponse();

    // Act
    await controller.approveLeaveRequest(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});

describe("LeaveRequestController.rejectLeaveRequest", () => {
  it("returns 200 when service resolves successfully", async () => {
    // Arrange
    mockService.rejectLeaveRequest.mockResolvedValue(successResult);
    const req = makeAuthRequest({
      role: RoleType.Manager,
      body: { leave_request_id: 2 },
    });
    const res = mockResponse();

    // Act
    await controller.rejectLeaveRequest(req, res);

    // Assert
    expect(mockService.rejectLeaveRequest).toHaveBeenCalledWith(
      req.signedInUser?.token,
      req.body,
    );
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 403 when manager tries to reject outside their team", async () => {
    // Arrange
    mockService.rejectLeaveRequest.mockRejectedValue(
      new AppError(
        "You can only reject leave requests for your direct reports",
        StatusCodes.FORBIDDEN,
      ),
    );
    const req = makeAuthRequest({
      role: RoleType.Manager,
      body: { leave_request_id: 99 },
    });
    const res = mockResponse();

    // Act
    await controller.rejectLeaveRequest(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
  });
});

describe("LeaveRequestController.getLeaveRequestsByEmployee", () => {
  it("returns 400 for non-numeric employee_id", async () => {
    // Arrange
    const req = makeAuthRequest({ params: { employee_id: "abc" } });
    const res = mockResponse();

    // Act
    await controller.getLeaveRequestsByEmployee(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(mockService.getLeaveRequestsByEmployee).not.toHaveBeenCalled();
  });

  it("returns 200 with leave requests from service", async () => {
    // Arrange
    mockService.getLeaveRequestsByEmployee.mockResolvedValue(successResult);
    const req = makeAuthRequest({ params: { employee_id: "4" } });
    const res = mockResponse();

    // Act
    await controller.getLeaveRequestsByEmployee(req, res);

    // Assert
    expect(mockService.getLeaveRequestsByEmployee).toHaveBeenCalledWith(
      req.signedInUser?.token,
      4,
    );
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 403 when service throws FORBIDDEN AppError", async () => {
    // Arrange
    mockService.getLeaveRequestsByEmployee.mockRejectedValue(
      new AppError(
        "You are not authorised to view leave requests for this employee",
        StatusCodes.FORBIDDEN,
      ),
    );
    const req = makeAuthRequest({ params: { employee_id: "99" } });
    const res = mockResponse();

    // Act
    await controller.getLeaveRequestsByEmployee(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
  });
});

describe("LeaveRequestController.getRemainingLeave", () => {
  it("returns 400 for non-numeric employee_id", async () => {
    // Arrange
    const req = makeAuthRequest({ params: { employee_id: "abc" } });
    const res = mockResponse();

    // Act
    await controller.getRemainingLeave(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(mockService.getRemainingLeave).not.toHaveBeenCalled();
  });

  it("returns 200 with remaining leave data from service", async () => {
    // Arrange
    mockService.getRemainingLeave.mockResolvedValue(successResult);
    const req = makeAuthRequest({ params: { employee_id: "4" } });
    const res = mockResponse();

    // Act
    await controller.getRemainingLeave(req, res);

    // Assert
    expect(mockService.getRemainingLeave).toHaveBeenCalledWith(
      req.signedInUser?.token,
      4,
    );
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });
});

describe("LeaveRequestController.getPendingRequestsByManager", () => {
  it("returns 400 for non-numeric manager_id", async () => {
    // Arrange
    const req = makeAuthRequest({ params: { manager_id: "abc" } });
    const res = mockResponse();

    // Act
    await controller.getPendingRequestsByManager(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(mockService.getPendingRequestsByManager).not.toHaveBeenCalled();
  });

  it("returns 200 with pending requests from service", async () => {
    // Arrange
    mockService.getPendingRequestsByManager.mockResolvedValue(successResult);
    const req = makeAuthRequest({
      role: RoleType.Manager,
      params: { manager_id: "2" },
    });
    const res = mockResponse();

    // Act
    await controller.getPendingRequestsByManager(req, res);

    // Assert
    expect(mockService.getPendingRequestsByManager).toHaveBeenCalledWith(
      req.signedInUser?.token,
      2,
      expect.any(Object),
    );
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });
});

describe("LeaveRequestController.getAllLeaveRequests", () => {
  it("returns 200 with all leave requests from service", async () => {
    // Arrange
    mockService.getAllLeaveRequests.mockResolvedValue(successResult);
    const req = makeAuthRequest({ role: RoleType.Admin });
    const res = mockResponse();

    // Act
    await controller.getAllLeaveRequests(req, res);

    // Assert
    expect(mockService.getAllLeaveRequests).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 500 on unexpected error", async () => {
    // Arrange
    mockService.getAllLeaveRequests.mockRejectedValue(new Error("DB failure"));
    const req = makeAuthRequest({ role: RoleType.Admin });
    const res = mockResponse();

    // Act
    await controller.getAllLeaveRequests(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});

describe("LeaveRequestController.getLeaveCalendar", () => {
  it("returns 200 with calendar data from service", async () => {
    // Arrange
    mockService.getLeaveCalendar.mockResolvedValue(successResult);
    const req = makeAuthRequest({
      role: RoleType.Admin,
      query: { from: "2026-09-01", to: "2026-09-30" },
    });
    const res = mockResponse();

    // Act
    await controller.getLeaveCalendar(req, res);

    // Assert
    expect(mockService.getLeaveCalendar).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 400 when service throws BAD_REQUEST", async () => {
    // Arrange
    mockService.getLeaveCalendar.mockRejectedValue(
      new AppError(
        "from and to query params are required",
        StatusCodes.BAD_REQUEST,
      ),
    );
    const req = makeAuthRequest({ role: RoleType.Admin });
    const res = mockResponse();

    // Act
    await controller.getLeaveCalendar(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });
});

describe("LeaveRequestController.getLeaveUsageReport", () => {
  it("returns 200 with usage report from service", async () => {
    // Arrange
    mockService.getLeaveUsageReport.mockResolvedValue(successResult);
    const req = makeAuthRequest({ role: RoleType.Admin });
    const res = mockResponse();

    // Act
    await controller.getLeaveUsageReport(req, res);

    // Assert
    expect(mockService.getLeaveUsageReport).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 500 on unexpected error", async () => {
    // Arrange
    mockService.getLeaveUsageReport.mockRejectedValue(new Error("DB failure"));
    const req = makeAuthRequest({ role: RoleType.Admin });
    const res = mockResponse();

    // Act
    await controller.getLeaveUsageReport(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});

describe("LeaveRequestController.exportLeaveReport", () => {
  it("returns CSV with correct headers on success", async () => {
    // Arrange
    mockService.exportLeaveReport.mockResolvedValue({
      csv: "employee_id,name\n1,John",
      filename: "report.csv",
    });
    const req = makeAuthRequest({ role: RoleType.Admin });
    const res = mockResponse();

    // Act
    await controller.exportLeaveReport(req, res);

    // Assert
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 403 when service throws FORBIDDEN", async () => {
    // Arrange
    mockService.exportLeaveReport.mockRejectedValue(
      new AppError("Access denied", StatusCodes.FORBIDDEN),
    );
    const req = makeAuthRequest({ role: RoleType.Manager });
    const res = mockResponse();

    // Act
    await controller.exportLeaveReport(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
  });
});
