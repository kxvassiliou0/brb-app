import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../helpers/AppError.ts";
import { ResponseHandler } from "../helpers/ResponseHandler.ts";
import type { ILoginController } from "../types/ILoginController.ts";
import type { ILoginService } from "../types/ILoginService.ts";

export class LoginController implements ILoginController {
  constructor(private readonly service: ILoginService) {}

  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      const token = await this.service.login(email, password);
      res.status(StatusCodes.ACCEPTED).send(token);
    } catch (error) {
      const statusCode =
        error instanceof AppError ? error.statusCode : StatusCodes.BAD_REQUEST;
      ResponseHandler.sendErrorResponse(
        res,
        statusCode,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };
}
