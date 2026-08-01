import winston from "winston";

const { combine, timestamp, errors, splat, json } = winston.format;

export class Logger {
  private static instance: winston.Logger | null = null;

  private static getInstance(): winston.Logger {
    if (!Logger.instance) {
      const level = process.env.NODE_ENV === "production" ? "info" : "debug";

      Logger.instance = winston.createLogger({
        level,
        format: combine(
          timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          errors({ stack: true }),
          splat(),
          json(),
        ),
        transports: [
          new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
          }),
          new winston.transports.File({ filename: "logs/output.log" }),
        ],
      });
    }

    return Logger.instance;
  }

  static info(message: string, meta?: object): void {
    Logger.getInstance().info(message, meta);
  }

  static error(message: string, meta?: object): void {
    Logger.getInstance().error(message, meta);
  }

  static warn(message: string, meta?: object): void {
    Logger.getInstance().warn(message, meta);
  }

  static debug(message: string, meta?: object): void {
    Logger.getInstance().debug(message, meta);
  }

  static trace(message: string, meta?: object): void {
    Logger.getInstance().verbose(message, meta);
  }
}
