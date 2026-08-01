import request from "supertest";
import express, { Router } from "express";
import type { AuthenticatedJWTRequest } from "../interfaces/AuthenticatedJWTRequest.interface";
import { RoleType } from "../enums/index";
import { DepartmentRouter } from "./DepartmentRouter";
import { DepartmentController } from "../controllers/DepartmentController";
import { StatusCodes } from "http-status-codes";

const mockDepartmentController = {
  delete: jest.fn((req, res) =>
    res.status(StatusCodes.OK).json({ id: req.params.id }),
  ),
  getAll: jest.fn((_req, res) => res.status(StatusCodes.OK).json([])),
  getById: jest.fn((req, res) =>
    res.status(StatusCodes.OK).json({ id: req.params.id }),
  ),
  create: jest.fn((req, res) => res.status(StatusCodes.CREATED).json(req.body)),
  update: jest.fn((req, res) => res.status(StatusCodes.OK).json(req.body)),
} as unknown as DepartmentController;

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

const departmentRouter = new DepartmentRouter(router, mockDepartmentController);
app.use("/departments", departmentRouter.getRouter());

const BASE_URL = "/departments";

describe("DepartmentRouter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getAll on GET /departments can be called", async () => {
    // Arrange - app and mock controller configured above

    // Act
    const response = await request(app).get(BASE_URL);

    // Assert
    expect(mockDepartmentController.getAll).toHaveBeenCalled();
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual([]);
  });

  it("getById route GET /departments/:id can be called", async () => {
    // Arrange
    const id = "1";
    const endPoint = `${BASE_URL}/${id}`;

    // Act
    const response = await request(app).get(endPoint);

    // Assert
    const reqArg = (mockDepartmentController.getById as jest.Mock).mock
      .calls[0][0];
    expect(reqArg.originalUrl).toBe(endPoint);
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual({ id });
  });

  it("create route POST /departments can be called", async () => {
    // Arrange
    const newDepartmentData = { name: "Engineering" };

    // Act
    const response = await request(app).post(BASE_URL).send(newDepartmentData);

    // Assert
    const body = (mockDepartmentController.create as jest.Mock).mock.calls[0][0]
      .body;
    expect(body).toBeDefined();
    expect(mockDepartmentController.create).toHaveBeenCalled();
    expect(body).toStrictEqual(newDepartmentData);
    expect(response.status).toBe(StatusCodes.CREATED);
  });

  it("update route PATCH /departments/:id can be called", async () => {
    // Arrange
    const id = "1";
    const endPoint = `${BASE_URL}/${id}`;
    const updateData = { id, name: "Product" };

    // Act
    const response = await request(app).patch(endPoint).send(updateData);

    // Assert
    const reqArg = (mockDepartmentController.update as jest.Mock).mock
      .calls[0][0];
    expect(reqArg.originalUrl).toBe(endPoint);
    expect(reqArg.body).toStrictEqual(updateData);
    expect(mockDepartmentController.update).toHaveBeenCalled();
    expect(response.status).toBe(StatusCodes.OK);
  });

  it("delete route DELETE /departments/:id can be called", async () => {
    // Arrange
    const id = "1";
    const endPoint = `${BASE_URL}/${id}`;

    // Act
    const response = await request(app).delete(endPoint);

    // Assert
    const reqArg = (mockDepartmentController.delete as jest.Mock).mock
      .calls[0][0];
    expect(reqArg.originalUrl).toBe(endPoint);
    expect(mockDepartmentController.delete).toHaveBeenCalled();
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual({ id });
  });
});
