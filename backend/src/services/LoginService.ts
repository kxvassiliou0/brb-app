import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import type { Repository } from "typeorm";
import { UserDTOToken } from "../dto/UserDTOToken.ts";
import { User } from "../entities/User.entity.ts";
import { AppError } from "../helpers/AppError.ts";
import { PasswordHandler } from "../helpers/PasswordHandler.ts";
import type { ILoginService } from "../types/ILoginService.ts";

export class LoginService implements ILoginService {
  constructor(private readonly userRepo: Repository<User>) {}

  async login(email: string, password: string): Promise<string> {
    if (!email || !password) {
      throw new AppError(
        "Email and password are required",
        StatusCodes.BAD_REQUEST,
      );
    }

    const user = await this.userRepo
      .createQueryBuilder("user")
      .addSelect(["user.password", "user.salt"])
      .where("user.email = :email", { email })
      .getOne();

    if (!user) {
      throw new AppError("User not found", StatusCodes.UNAUTHORIZED);
    }

    if (!PasswordHandler.verifyPassword(password, user.password, user.salt)) {
      throw new AppError("Incorrect password", StatusCodes.UNAUTHORIZED);
    }

    const token = new UserDTOToken(user.id, user.email, user.role);
    return jwt.sign({ token }, process.env.JWT_SECRET_KEY as string, {
      expiresIn: "3h",
    });
  }
}
