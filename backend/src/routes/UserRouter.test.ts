import request from "supertest";
import express, { Router } from "express";
import type { AuthenticatedJWTRequest } from "../interfaces/AuthenticatedJWTRequest.interface";
import { RoleType } from "../enums/index";
import { UserRouter } from "./UserRouter";
import { UserController } from "../controllers/UserController";
import { StatusCodes } from "http-status-codes";

const mockUserController = {
  getAll: jest.fn((_req, res) => res.status(StatusCodes.OK).json([])),
  getById: jest.fn((req, res) =>
    res.status(StatusCodes.OK).json({ id: req.params.id }),
  ),
  getMe: jest.fn((req, res) =>
    res
      .status(StatusCodes.OK)
      .json({ id: req.signedInUser?.token?.id ?? null }),
  ),
  create: jest.fn((req, res) => res.status(StatusCodes.CREATED).json(req.body)),
  update: jest.fn((req, res) => res.status(StatusCodes.OK).json(req.body)),
  changeOwnPassword: jest.fn((req, res) =>
    res
      .status(StatusCodes.OK)
      .json({ id: req.signedInUser?.token?.id ?? null }),
  ),
  delete: jest.fn((req, res) =>
    res.status(StatusCodes.OK).json({ id: req.params.id }),
  ),
} as unknown as UserController;

const router = Router();
jest.spyOn(router, "get");
jest.spyOn(router, "post");
jest.spyOn(router, "patch");
jest.spyOn(router, "delete");

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as AuthenticatedJWTRequest).signedInUser = {
    token: { email: "admin@test.com", role: RoleType.Admin },
  };
  next();
});

const userRouter = new UserRouter(router, mockUserController);
app.use("/users", userRouter.getRouter());

const BASE_URL = "/users";

function buildApp(role?: RoleType, id = 1): express.Express {
  const scopedApp = express();
  scopedApp.use(express.json());
  scopedApp.use((req, _res, next) => {
    if (role) {
      (req as AuthenticatedJWTRequest).signedInUser = {
        token: { id, email: `${role.toLowerCase()}@test.com`, role },
      };
    }
    next();
  });
  scopedApp.use(
    BASE_URL,
    new UserRouter(Router(), mockUserController).getRouter(),
  );
  return scopedApp;
}

describe("UserRouter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /users calls getAll", async () => {
    // Arrange - app and mock controller configured above

    // Act
    const response = await request(app).get(BASE_URL);

    // Assert
    expect(mockUserController.getAll).toHaveBeenCalled();
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual([]);
  });

  it("GET /users/:id calls getById", async () => {
    // Arrange
    const id = "1";

    // Act
    const response = await request(app).get(`${BASE_URL}/${id}`);

    // Assert
    const reqArg = (mockUserController.getById as jest.Mock).mock.calls[0][0];
    expect(reqArg.originalUrl).toBe(`${BASE_URL}/${id}`);
    expect(mockUserController.getById).toHaveBeenCalled();
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual({ id });
  });

  it("GET /users/me calls getMe and not the admin-only getById", async () => {
    // Arrange - /me must be registered ahead of /:id or it matches as an id
    const scopedApp = buildApp(RoleType.Employee, 7);

    // Act
    const response = await request(scopedApp).get(`${BASE_URL}/me`);

    // Assert
    expect(mockUserController.getMe).toHaveBeenCalled();
    expect(mockUserController.getById).not.toHaveBeenCalled();
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual({ id: 7 });
  });

  it.each([RoleType.Employee, RoleType.Manager, RoleType.Admin])(
    "GET /users/me is reachable by role %s",
    async (role) => {
      // Arrange
      const scopedApp = buildApp(role);

      // Act
      const response = await request(scopedApp).get(`${BASE_URL}/me`);

      // Assert
      expect(mockUserController.getMe).toHaveBeenCalled();
      expect(response.status).toBe(StatusCodes.OK);
    },
  );

  it("GET /users/me is refused with 403 when the request carries no token", async () => {
    // Arrange
    const scopedApp = buildApp(undefined);

    // Act
    const response = await request(scopedApp).get(`${BASE_URL}/me`);

    // Assert
    expect(response.status).toBe(StatusCodes.FORBIDDEN);
    expect(mockUserController.getMe).not.toHaveBeenCalled();
  });

  it("POST /users calls create", async () => {
    // Arrange
    const newUser = {
      firstName: "Alice",
      lastName: "Johnson",
      email: "alice@company.com",
    };

    // Act
    const response = await request(app).post(BASE_URL).send(newUser);

    // Assert
    const body = (mockUserController.create as jest.Mock).mock.calls[0][0].body;
    expect(body).toStrictEqual(newUser);
    expect(mockUserController.create).toHaveBeenCalled();
    expect(response.status).toBe(StatusCodes.CREATED);
  });

  it("PATCH /users/:id calls update", async () => {
    // Arrange
    const id = "1";
    const updateData = { firstName: "Bob" };

    // Act
    const response = await request(app)
      .patch(`${BASE_URL}/${id}`)
      .send(updateData);

    // Assert
    const reqArg = (mockUserController.update as jest.Mock).mock.calls[0][0];
    expect(reqArg.originalUrl).toBe(`${BASE_URL}/${id}`);
    expect(reqArg.body).toStrictEqual(updateData);
    expect(mockUserController.update).toHaveBeenCalled();
    expect(response.status).toBe(StatusCodes.OK);
  });

  it.each([RoleType.Employee, RoleType.Manager, RoleType.Admin])(
    "PATCH /users/me/password is reachable by role %s",
    async (role) => {
      // Arrange
      const scopedApp = buildApp(role, 7);

      // Act
      const response = await request(scopedApp)
        .patch(`${BASE_URL}/me/password`)
        .send({
          currentPassword: "CurrentPassword1!",
          newPassword: "BrandNewPassword1!",
        });

      // Assert
      expect(mockUserController.changeOwnPassword).toHaveBeenCalled();
      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual({ id: 7 });
    },
  );

  it("PATCH /users/me/password calls changeOwnPassword and not the admin-only update", async () => {
    // Arrange - /me/password must not fall through to the /:id update route
    const scopedApp = buildApp(RoleType.Employee, 7);

    // Act
    await request(scopedApp).patch(`${BASE_URL}/me/password`).send({
      currentPassword: "CurrentPassword1!",
      newPassword: "BrandNewPassword1!",
    });

    // Assert
    expect(mockUserController.changeOwnPassword).toHaveBeenCalled();
    expect(mockUserController.update).not.toHaveBeenCalled();
  });

  it("PATCH /users/me/password is refused with 403 when the request carries no token", async () => {
    // Arrange
    const scopedApp = buildApp(undefined);

    // Act
    const response = await request(scopedApp)
      .patch(`${BASE_URL}/me/password`)
      .send({
        currentPassword: "CurrentPassword1!",
        newPassword: "BrandNewPassword1!",
      });

    // Assert
    expect(response.status).toBe(StatusCodes.FORBIDDEN);
    expect(mockUserController.changeOwnPassword).not.toHaveBeenCalled();
  });

  it("PATCH /users/:id remains Admin-only and does not reach changeOwnPassword", async () => {
    // Arrange
    const scopedApp = buildApp(RoleType.Employee, 7);

    // Act
    const response = await request(scopedApp)
      .patch(`${BASE_URL}/2`)
      .send({ password: "BrandNewPassword1!" });

    // Assert
    expect(response.status).toBe(StatusCodes.FORBIDDEN);
    expect(mockUserController.update).not.toHaveBeenCalled();
    expect(mockUserController.changeOwnPassword).not.toHaveBeenCalled();
  });

  it("DELETE /users/:id calls delete", async () => {
    // Arrange
    const id = "1";

    // Act
    const response = await request(app).delete(`${BASE_URL}/${id}`);

    // Assert
    const reqArg = (mockUserController.delete as jest.Mock).mock.calls[0][0];
    expect(reqArg.originalUrl).toBe(`${BASE_URL}/${id}`);
    expect(mockUserController.delete).toHaveBeenCalled();
    expect(response.status).toBe(StatusCodes.OK);
  });
});
