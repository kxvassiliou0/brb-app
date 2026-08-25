import { mock, MockProxy } from "jest-mock-extended";
import { StatusCodes } from "http-status-codes";
import { UserController } from "./UserController";
import { RoleType } from "../enums/index";
import { AppError } from "../helpers/AppError";
import { AUTH_ERRORS } from "../helpers/AuthErrors";
import type { AuthenticatedJWTRequest } from "../interfaces/AuthenticatedJWTRequest.interface";
import type { IUserService } from "../types/IUserService";
import {
  makeAuthRequest,
  makeUser,
  makeUserListItem,
  makeUserProfile,
  mockRequest,
  mockResponse,
} from "../test/ObjectMother";

let mockService: MockProxy<IUserService>;
let controller: UserController;

beforeEach(() => {
  mockService = mock<IUserService>();
  controller = new UserController(mockService);
  jest.clearAllMocks();
});

describe("UserController.getAll", () => {
  it("returns 200 with users when service returns results", async () => {
    // Arrange
    mockService.getAll.mockResolvedValue([makeUserListItem()]);
    const req = mockRequest();
    const res = mockResponse();

    // Act
    await controller.getAll(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 204 when service returns empty array", async () => {
    // Arrange
    mockService.getAll.mockResolvedValue([]);
    const req = mockRequest();
    const res = mockResponse();

    // Act
    await controller.getAll(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.NO_CONTENT);
  });

  it("returns 500 on unexpected error", async () => {
    // Arrange
    mockService.getAll.mockRejectedValue(new Error("DB failure"));
    const req = mockRequest();
    const res = mockResponse();

    // Act
    await controller.getAll(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});

describe("UserController.getById", () => {
  it("returns 400 for non-numeric id", async () => {
    // Arrange
    const req = mockRequest({ id: "abc" });
    const res = mockResponse();

    // Act
    await controller.getById(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("returns 200 with user from service", async () => {
    // Arrange
    mockService.getById.mockResolvedValue(makeUser());
    const req = mockRequest({ id: "1" });
    const res = mockResponse();

    // Act
    await controller.getById(req, res);

    // Assert
    expect(mockService.getById).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 404 when service throws NOT_FOUND AppError", async () => {
    // Arrange
    mockService.getById.mockRejectedValue(
      new AppError("User not found with ID: 99", StatusCodes.NOT_FOUND),
    );
    const req = mockRequest({ id: "99" });
    const res = mockResponse();

    // Act
    await controller.getById(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
  });

  it("returns 500 on unexpected non-AppError from service", async () => {
    // Arrange
    mockService.getById.mockRejectedValue(new Error("DB failure"));
    const req = mockRequest({ id: "1" });
    const res = mockResponse();

    // Act
    await controller.getById(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});

describe("UserController.getMe", () => {
  it.each([RoleType.Employee, RoleType.Manager, RoleType.Admin])(
    "returns 200 with the caller's own profile for role %s",
    async (role) => {
      // Arrange
      const profile = makeUserProfile({ role });
      mockService.getOwnProfile.mockResolvedValue(profile);
      const req = makeAuthRequest({ id: 1, role });
      const res = mockResponse();

      // Act
      await controller.getMe(req, res);

      // Assert
      expect(mockService.getOwnProfile).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith({ data: profile });
    },
  );

  it("resolves the user from the token, ignoring params, body and query", async () => {
    // Arrange
    mockService.getOwnProfile.mockResolvedValue(makeUserProfile({ id: 7 }));
    const req = makeAuthRequest({
      id: 7,
      role: RoleType.Employee,
      params: { id: "999" },
      body: { id: 999 },
      query: { id: "999" },
    });
    const res = mockResponse();

    // Act
    await controller.getMe(req, res);

    // Assert
    expect(mockService.getOwnProfile).toHaveBeenCalledTimes(1);
    expect(mockService.getOwnProfile).toHaveBeenCalledWith(7);
    expect(mockService.getOwnProfile).not.toHaveBeenCalledWith(999);
  });

  it("refuses an unauthenticated request with 401 and never reaches the service", async () => {
    // Arrange
    const req = mockRequest() as AuthenticatedJWTRequest;
    const res = mockResponse();

    // Act
    await controller.getMe(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith({
      error: AUTH_ERRORS.TOKEN_IS_INVALID,
    });
    expect(mockService.getOwnProfile).not.toHaveBeenCalled();
  });

  it("does not include password or salt in the response body", async () => {
    // Arrange
    mockService.getOwnProfile.mockResolvedValue(makeUserProfile());
    const req = makeAuthRequest({ id: 1, role: RoleType.Employee });
    const res = mockResponse();

    // Act
    await controller.getMe(req, res);

    // Assert
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.data).not.toHaveProperty("password");
    expect(body.data).not.toHaveProperty("salt");
  });

  it("returns 404 when service throws NOT_FOUND AppError", async () => {
    // Arrange
    mockService.getOwnProfile.mockRejectedValue(
      new AppError("User not found with ID: 1", StatusCodes.NOT_FOUND),
    );
    const req = makeAuthRequest({ id: 1, role: RoleType.Employee });
    const res = mockResponse();

    // Act
    await controller.getMe(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
  });

  it("returns 500 on unexpected non-AppError from service", async () => {
    // Arrange
    mockService.getOwnProfile.mockRejectedValue(new Error("DB failure"));
    const req = makeAuthRequest({ id: 1, role: RoleType.Employee });
    const res = mockResponse();

    // Act
    await controller.getMe(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});

describe("UserController.changeOwnPassword", () => {
  const CURRENT_PASSWORD = "CurrentPassword1!";
  const NEW_PASSWORD = "BrandNewPassword1!";
  const VALID_BODY = {
    currentPassword: CURRENT_PASSWORD,
    newPassword: NEW_PASSWORD,
  };

  it.each([RoleType.Employee, RoleType.Manager, RoleType.Admin])(
    "returns 200 and changes the caller's own password for role %s",
    async (role) => {
      // Arrange
      mockService.changeOwnPassword.mockResolvedValue();
      const req = makeAuthRequest({ id: 1, role, body: { ...VALID_BODY } });
      const res = mockResponse();

      // Act
      await controller.changeOwnPassword(req, res);

      // Assert
      expect(mockService.changeOwnPassword).toHaveBeenCalledWith(
        1,
        CURRENT_PASSWORD,
        NEW_PASSWORD,
      );
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    },
  );

  it("resolves the user from the token, ignoring params, body and query", async () => {
    // Arrange
    mockService.changeOwnPassword.mockResolvedValue();
    const req = makeAuthRequest({
      id: 7,
      role: RoleType.Employee,
      params: { id: "7" },
      body: { ...VALID_BODY, id: 7 },
      query: { id: "999" },
    });
    const res = mockResponse();

    // Act
    await controller.changeOwnPassword(req, res);

    // Assert
    expect(mockService.changeOwnPassword).toHaveBeenCalledTimes(1);
    expect(mockService.changeOwnPassword).toHaveBeenCalledWith(
      7,
      CURRENT_PASSWORD,
      NEW_PASSWORD,
    );
  });

  it.each([RoleType.Employee, RoleType.Manager, RoleType.Admin])(
    "refuses with 403 when role %s targets another user's ID in the body",
    async (role) => {
      // Arrange
      const req = makeAuthRequest({
        id: 1,
        role,
        body: { ...VALID_BODY, id: 2 },
      });
      const res = mockResponse();

      // Act
      await controller.changeOwnPassword(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
      expect(mockService.changeOwnPassword).not.toHaveBeenCalled();
    },
  );

  it.each([RoleType.Employee, RoleType.Manager, RoleType.Admin])(
    "refuses with 403 when role %s targets another user's ID via userId",
    async (role) => {
      // Arrange
      const req = makeAuthRequest({
        id: 1,
        role,
        body: { ...VALID_BODY, userId: 2 },
      });
      const res = mockResponse();

      // Act
      await controller.changeOwnPassword(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
      expect(mockService.changeOwnPassword).not.toHaveBeenCalled();
    },
  );

  it.each([RoleType.Employee, RoleType.Manager, RoleType.Admin])(
    "refuses with 403 when role %s targets another user's ID in the route params",
    async (role) => {
      // Arrange
      const req = makeAuthRequest({
        id: 1,
        role,
        params: { id: "2" },
        body: { ...VALID_BODY },
      });
      const res = mockResponse();

      // Act
      await controller.changeOwnPassword(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
      expect(mockService.changeOwnPassword).not.toHaveBeenCalled();
    },
  );

  it("returns 401 for an unauthenticated request and never reaches the service", async () => {
    // Arrange
    const req = mockRequest({}, { ...VALID_BODY }) as AuthenticatedJWTRequest;
    const res = mockResponse();

    // Act
    await controller.changeOwnPassword(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith({
      error: AUTH_ERRORS.TOKEN_IS_INVALID,
    });
    expect(mockService.changeOwnPassword).not.toHaveBeenCalled();
  });

  it.each([
    ["current password missing", { newPassword: NEW_PASSWORD }],
    ["new password missing", { currentPassword: CURRENT_PASSWORD }],
    ["current password empty", { ...VALID_BODY, currentPassword: "" }],
    ["new password not a string", { ...VALID_BODY, newPassword: 12345 }],
    ["body empty", {}],
  ])("returns 400 when the %s", async (_case, body) => {
    // Arrange
    const req = makeAuthRequest({ id: 1, role: RoleType.Employee, body });
    const res = mockResponse();

    // Act
    await controller.changeOwnPassword(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(mockService.changeOwnPassword).not.toHaveBeenCalled();
  });

  it("returns 401 when the service rejects an incorrect current password", async () => {
    // Arrange
    mockService.changeOwnPassword.mockRejectedValue(
      new AppError("Current password is incorrect", StatusCodes.UNAUTHORIZED),
    );
    const req = makeAuthRequest({
      id: 1,
      role: RoleType.Employee,
      body: { ...VALID_BODY },
    });
    const res = mockResponse();

    // Act
    await controller.changeOwnPassword(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith({
      error: "Current password is incorrect",
    });
  });

  it("returns 422 when the service rejects a new password under 10 characters", async () => {
    // Arrange
    mockService.changeOwnPassword.mockRejectedValue(
      new AppError(
        "Password must be at least 10 characters long",
        StatusCodes.UNPROCESSABLE_ENTITY,
      ),
    );
    const req = makeAuthRequest({
      id: 1,
      role: RoleType.Employee,
      body: { ...VALID_BODY, newPassword: "Short1!" },
    });
    const res = mockResponse();

    // Act
    await controller.changeOwnPassword(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNPROCESSABLE_ENTITY);
  });

  it("never echoes the submitted passwords back in the response", async () => {
    // Arrange
    mockService.changeOwnPassword.mockResolvedValue();
    const req = makeAuthRequest({
      id: 1,
      role: RoleType.Employee,
      body: { ...VALID_BODY },
    });
    const res = mockResponse();

    // Act
    await controller.changeOwnPassword(req, res);

    // Assert
    const body = JSON.stringify((res.json as jest.Mock).mock.calls[0][0]);
    expect(body).not.toContain(CURRENT_PASSWORD);
    expect(body).not.toContain(NEW_PASSWORD);
  });

  it("returns 500 on unexpected non-AppError from service", async () => {
    // Arrange
    mockService.changeOwnPassword.mockRejectedValue(new Error("DB failure"));
    const req = makeAuthRequest({
      id: 1,
      role: RoleType.Employee,
      body: { ...VALID_BODY },
    });
    const res = mockResponse();

    // Act
    await controller.changeOwnPassword(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});

describe("UserController.create", () => {
  it("returns 201 with created user on success", async () => {
    // Arrange
    mockService.create.mockResolvedValue(makeUser());
    const req = mockRequest(
      {},
      { firstName: "Alice", email: "alice@company.com" },
    );
    const res = mockResponse();

    // Act
    await controller.create(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
  });

  it("returns 422 when service throws validation AppError", async () => {
    // Arrange
    mockService.create.mockRejectedValue(
      new AppError("isNotEmpty", StatusCodes.UNPROCESSABLE_ENTITY),
    );
    const req = mockRequest({}, {});
    const res = mockResponse();

    // Act
    await controller.create(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNPROCESSABLE_ENTITY);
  });
});

describe("UserController.update", () => {
  it("returns 400 for non-numeric id", async () => {
    // Arrange
    const req = mockRequest({ id: "xyz" });
    const res = mockResponse();

    // Act
    await controller.update(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("returns 200 with updated user on success", async () => {
    // Arrange
    mockService.update.mockResolvedValue(
      makeUser({ annualLeaveAllowance: 30 }),
    );
    const req = mockRequest({ id: "1" }, { annualLeaveAllowance: 30 });
    const res = mockResponse();

    // Act
    await controller.update(req, res);

    // Assert
    expect(mockService.update).toHaveBeenCalledWith(1, {
      annualLeaveAllowance: 30,
    });
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 404 when service throws NOT_FOUND AppError", async () => {
    // Arrange
    mockService.update.mockRejectedValue(
      new AppError("User not found", StatusCodes.NOT_FOUND),
    );
    const req = mockRequest({ id: "99" }, {});
    const res = mockResponse();

    // Act
    await controller.update(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
  });
});

describe("UserController.delete", () => {
  it("returns 400 when no id is provided", async () => {
    // Arrange
    const req = mockRequest(); // params empty → req.params.id is undefined
    const res = mockResponse();

    // Act
    await controller.delete(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });

  it("returns 200 when user is deleted successfully", async () => {
    // Arrange
    mockService.delete.mockResolvedValue();
    const req = mockRequest({ id: "7" });
    const res = mockResponse();

    // Act
    await controller.delete(req, res);

    // Assert
    expect(mockService.delete).toHaveBeenCalledWith(7);
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
  });

  it("returns 404 when service throws NOT_FOUND AppError", async () => {
    // Arrange
    mockService.delete.mockRejectedValue(
      new AppError("User not found", StatusCodes.NOT_FOUND),
    );
    const req = mockRequest({ id: "99" });
    const res = mockResponse();

    // Act
    await controller.delete(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
  });
});
