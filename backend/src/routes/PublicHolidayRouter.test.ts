import express, { Router } from "express";
import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { PublicHolidayController } from "../controllers/PublicHolidayController";
import { RoleType } from "../enums/index";
import type { AuthenticatedJWTRequest } from "../interfaces/AuthenticatedJWTRequest.interface";
import { PublicHolidayRouter } from "./PublicHolidayRouter";

const mockPublicHolidayController = {
  getAll: jest.fn((_req, res) => res.status(StatusCodes.OK).json([])),
  getById: jest.fn((req, res) =>
    res.status(StatusCodes.OK).json({ id: req.params.id }),
  ),
  create: jest.fn((req, res) => res.status(StatusCodes.CREATED).json(req.body)),
  update: jest.fn((req, res) => res.status(StatusCodes.OK).json(req.body)),
  delete: jest.fn((req, res) =>
    res.status(StatusCodes.NO_CONTENT).json({ id: req.params.id }),
  ),
} as unknown as PublicHolidayController;

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

const publicHolidayRouter = new PublicHolidayRouter(
  router,
  mockPublicHolidayController,
);
app.use("/public-holidays", publicHolidayRouter.getRouter());

const BASE_URL = "/public-holidays";

describe("PublicHolidayRouter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getAll on GET /public-holidays can be called", async () => {
    // Arrange - app and mock controller configured above

    // Act
    const response = await request(app).get(BASE_URL);

    // Assert
    expect(mockPublicHolidayController.getAll).toHaveBeenCalled();
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual([]);
  });

  it("getById on GET /public-holidays/:id can be called", async () => {
    // Arrange
    const id = "1";
    const endPoint = `${BASE_URL}/${id}`;

    // Act
    const response = await request(app).get(endPoint);

    // Assert
    const reqArg = (mockPublicHolidayController.getById as jest.Mock).mock
      .calls[0][0];
    expect(reqArg.originalUrl).toBe(endPoint);
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual({ id });
  });

  it("create on POST /public-holidays can be called", async () => {
    // Arrange
    const newHoliday = { date: "2026-12-25", name: "Christmas Day" };

    // Act
    const response = await request(app).post(BASE_URL).send(newHoliday);

    // Assert
    const body = (mockPublicHolidayController.create as jest.Mock).mock
      .calls[0][0].body;
    expect(mockPublicHolidayController.create).toHaveBeenCalled();
    expect(body).toStrictEqual(newHoliday);
    expect(response.status).toBe(StatusCodes.CREATED);
  });

  it("update on PATCH /public-holidays/:id can be called", async () => {
    // Arrange
    const id = "1";
    const endPoint = `${BASE_URL}/${id}`;
    const updateData = { name: "Boxing Day" };

    // Act
    const response = await request(app).patch(endPoint).send(updateData);

    // Assert
    const reqArg = (mockPublicHolidayController.update as jest.Mock).mock
      .calls[0][0];
    expect(reqArg.originalUrl).toBe(endPoint);
    expect(reqArg.body).toStrictEqual(updateData);
    expect(mockPublicHolidayController.update).toHaveBeenCalled();
    expect(response.status).toBe(StatusCodes.OK);
  });

  it("delete on DELETE /public-holidays/:id can be called", async () => {
    // Arrange
    const id = "1";
    const endPoint = `${BASE_URL}/${id}`;

    // Act
    const response = await request(app).delete(endPoint);

    // Assert
    const reqArg = (mockPublicHolidayController.delete as jest.Mock).mock
      .calls[0][0];
    expect(reqArg.originalUrl).toBe(endPoint);
    expect(mockPublicHolidayController.delete).toHaveBeenCalled();
    expect(response.status).toBe(StatusCodes.NO_CONTENT);
  });
});
