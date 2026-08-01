import { validate } from "class-validator";
import { StatusCodes } from "http-status-codes";
import type { Repository } from "typeorm";
import { User } from "../entities/User.entity.ts";
import { AppError } from "../helpers/AppError.ts";
import { PasswordHandler } from "../helpers/PasswordHandler.ts";
import type { IUserService } from "../types/IUserService.ts";

export class UserService implements IUserService {
  constructor(private readonly repo: Repository<User>) {}

  async getAll(): Promise<Array<User>> {
    return this.repo.find();
  }

  async getById(id: number): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user)
      throw new AppError(
        `User not found with ID: ${id}`,
        StatusCodes.NOT_FOUND,
      );
    return user;
  }

  async create(data: Partial<User>): Promise<User> {
    const user = new User();
    Object.assign(user, data);
    const errors = await validate(user);
    if (errors.length > 0) {
      throw new AppError(
        errors.map((e) => Object.values(e.constraints ?? {})).join(", "),
        StatusCodes.UNPROCESSABLE_ENTITY,
      );
    }
    const saved = await this.repo.save(user);
    return (await this.repo.findOneBy({ id: saved.id }))!;
  }

  async update(id: number, data: Partial<User>): Promise<User> {
    const user = await this.repo.findOneBy({ id });
    if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);
    Object.assign(user, data);
    if (data.password) {
      const { hashedPassword, salt } = PasswordHandler.hashPassword(
        data.password,
      );
      user.password = hashedPassword;
      user.salt = salt;
    }
    const errors = await validate(user, { skipMissingProperties: true });
    if (errors.length > 0) {
      throw new AppError(
        errors.map((e) => Object.values(e.constraints ?? {})).join(", "),
        StatusCodes.UNPROCESSABLE_ENTITY,
      );
    }
    await this.repo.save(user);
    return (await this.repo.findOneBy({ id }))!;
  }

  async delete(id: number): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0)
      throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }
}
