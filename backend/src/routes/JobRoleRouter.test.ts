import request from "supertest";
import express, { Router } from "express";
import type { AuthenticatedJWTRequest } from "../interfaces/AuthenticatedJWTRequest.interface";
import { RoleType } from "../enums/index";
import { JobRoleRouter } from "./JobRoleRouter";
import { JobRoleController } from "../controllers/JobRoleController";
import { StatusCodes } from "http-status-codes";

const mockJobRoleController = {
  delete: jest.fn((req, res) =>
    res.status(StatusCodes.OK).json({ id: req.params.id }),
  ),
  getAll: jest.fn((_req, res) => res.status(StatusCodes.OK).json([])),
  getById: jest.fn((req, res) =>
    res.status(StatusCodes.OK).json({ id: req.params.id }),
  ),
  create: jest.fn((req, res) => res.status(StatusCodes.CREATED).json(req.body)),
  update: jest.fn((req, res) => res.status(StatusCodes.OK).json(req.body)),
} as unknown as JobRoleController;

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

const jobRoleRouter = new JobRoleRouter(router, mockJobRoleController);
app.use("/job-roles", jobRoleRouter.getRouter());

const BASE_URL = "/job-roles";

describe("JobRoleRouter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getAll on GET /job-roles can be called", async () => {
    // Arrange - app and mock controller configured above

    // Act
    const response = await request(app).get(BASE_URL);

    // Assert
    expect(mockJobRoleController.getAll).toHaveBeenCalled();
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual([]);
  });

  it("getById route GET /job-roles/:id can be called", async () => {
    // Arrange
    const id = "1";
    const endPoint = `${BASE_URL}/${id}`;

    // Act
    const response = await request(app).get(endPoint);

    // Assert
    const reqArg = (mockJobRoleController.getById as jest.Mock).mock
      .calls[0][0];
    expect(reqArg.originalUrl).toBe(endPoint);
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual({ id });
  });

  it("create route POST /job-roles can be called", async () => {
    // Arrange
    const newJobRoleData = { name: "Senior Contractor" };

    // Act
    const response = await request(app).post(BASE_URL).send(newJobRoleData);

    // Assert
    const body = (mockJobRoleController.create as jest.Mock).mock.calls[0][0]
      .body;
    expect(body).toBeDefined();
    expect(mockJobRoleController.create).toHaveBeenCalled();
    expect(body).toStrictEqual(newJobRoleData);
    expect(response.status).toBe(StatusCodes.CREATED);
  });

  it("update route PATCH /job-roles/:id can be called", async () => {
    // Arrange
    const id = "1";
    const endPoint = `${BASE_URL}/${id}`;
    const updateData = { id, name: "Lead Engineer" };

    // Act
    const response = await request(app).patch(endPoint).send(updateData);

    // Assert
    const reqArg = (mockJobRoleController.update as jest.Mock).mock.calls[0][0];
    expect(reqArg.originalUrl).toBe(endPoint);
    expect(reqArg.body).toStrictEqual(updateData);
    expect(mockJobRoleController.update).toHaveBeenCalled();
    expect(response.status).toBe(StatusCodes.OK);
  });

  it("delete route DELETE /job-roles/:id can be called", async () => {
    // Arrange
    const id = "1";
    const endPoint = `${BASE_URL}/${id}`;

    // Act
    const response = await request(app).delete(endPoint);

    // Assert
    const reqArg = (mockJobRoleController.delete as jest.Mock).mock.calls[0][0];
    expect(reqArg.originalUrl).toBe(endPoint);
    expect(mockJobRoleController.delete).toHaveBeenCalled();
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual({ id });
  });
});
