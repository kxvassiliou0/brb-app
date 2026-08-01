import {
  Department,
  JobRole,
  LeaveRequest,
  PublicHoliday,
  User,
} from "@entities";
import { Router } from "express";
import "reflect-metadata";
import { DepartmentController } from "./controllers/DepartmentController.ts";
import { JobRoleController } from "./controllers/JobRoleController.ts";
import { LeaveRequestController } from "./controllers/LeaveRequestController.ts";
import { LoginController } from "./controllers/LoginController.ts";
import { PublicHolidayController } from "./controllers/PublicHolidayController.ts";
import { UserController } from "./controllers/UserController.ts";
import { AppDataSource } from "./data_source.ts";
import { DepartmentRouter } from "./routes/DepartmentRouter.ts";
import { JobRoleRouter } from "./routes/JobRoleRouter.ts";
import { LeaveRouter } from "./routes/LeaveRouter.ts";
import { LoginRouter } from "./routes/LoginRouter.ts";
import { PublicHolidayRouter } from "./routes/PublicHolidayRouter.ts";
import { UserRouter } from "./routes/UserRouter.ts";
import { Server } from "./Server.ts";
import { DepartmentService } from "./services/DepartmentService.ts";
import { JobRoleService } from "./services/JobRoleService.ts";
import { LeaveRequestService } from "./services/LeaveRequestService.ts";
import { LoginService } from "./services/LoginService.ts";
import { PublicHolidayService } from "./services/PublicHolidayService.ts";
import { UserService } from "./services/UserService.ts";
import type { IRouter } from "./types/IRouter.ts";

const DEFAULT_PORT = 3000;
const port = process.env.PORT ?? DEFAULT_PORT;

const routers: Array<IRouter> = [
  new LoginRouter(
    Router(),
    new LoginController(new LoginService(AppDataSource.getRepository(User))),
  ),
  new DepartmentRouter(
    Router(),
    new DepartmentController(
      new DepartmentService(AppDataSource.getRepository(Department)),
    ),
  ),
  new JobRoleRouter(
    Router(),
    new JobRoleController(
      new JobRoleService(AppDataSource.getRepository(JobRole)),
    ),
  ),
  new UserRouter(
    Router(),
    new UserController(new UserService(AppDataSource.getRepository(User))),
  ),
  new LeaveRouter(
    Router(),
    new LeaveRequestController(
      new LeaveRequestService(
        AppDataSource.getRepository(User),
        AppDataSource.getRepository(LeaveRequest),
        AppDataSource.getRepository(PublicHoliday),
      ),
    ),
  ),
  new PublicHolidayRouter(
    Router(),
    new PublicHolidayController(
      new PublicHolidayService(AppDataSource.getRepository(PublicHoliday)),
    ),
  ),
];

const server = new Server(port, routers, AppDataSource);
server.start();
