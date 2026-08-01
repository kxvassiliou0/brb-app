import type { Response } from "express";

export class ResponseHandler {
  static sendSuccessResponse(
    res: Response,
    data: unknown,
    statusCode = 200,
    message?: string,
  ): void {
    const body: Record<string, unknown> = { data };
    if (message !== undefined) body.message = message;
    res.status(statusCode).json(body);
  }

  static sendErrorResponse(
    res: Response,
    statusCode: number,
    message = "An error occurred",
  ): void {
    res.status(statusCode).json({ error: message });
  }
}
