import { validate } from "class-validator";
import { StatusCodes } from "http-status-codes";
import type { Repository } from "typeorm";
import {
  UserDTOListItem,
  UserDTOProfile,
  UserDTORelation,
} from "../dto/UserDTOProfile.ts";
import { User } from "../entities/User.entity.ts";
import { AppError } from "../helpers/AppError.ts";
import { PasswordHandler } from "../helpers/PasswordHandler.ts";
import type { IUserService } from "../types/IUserService.ts";

export const DUPLICATE_EMAIL_ERROR =
  "That email address already belongs to another user";

const MYSQL_DUPLICATE_ENTRY = 1062;

function isDuplicateEntry(error: unknown): boolean {
  const candidate = error as {
    code?: string;
    errno?: number;
    driverError?: { code?: string; errno?: number };
  };
  const code = candidate?.code ?? candidate?.driverError?.code;
  const errno = candidate?.errno ?? candidate?.driverError?.errno;
  return code === "ER_DUP_ENTRY" || errno === MYSQL_DUPLICATE_ENTRY;
}

export class UserService implements IUserService {
  constructor(private readonly repo: Repository<User>) {}

  private async saveUser(user: User): Promise<User> {
    try {
      return await this.repo.save(user);
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new AppError(DUPLICATE_EMAIL_ERROR, StatusCodes.CONFLICT);
      }
      throw error;
    }
  }

  async getAll(): Promise<Array<UserDTOListItem>> {
    const users = await this.repo.find({
      relations: { department: true, jobRole: true, manager: true },
      order: { firstName: "ASC", lastName: "ASC" },
    });
    return users.map(
      (user) =>
        new UserDTOListItem(
          user.id,
          user.firstName,
          user.lastName,
          user.email,
          user.role,
          user.annualLeaveAllowance,
          new UserDTORelation(user.department.id, user.department.name),
          new UserDTORelation(user.jobRole.id, user.jobRole.name),
          user.manager
            ? new UserDTORelation(
                user.manager.id,
                `${user.manager.firstName} ${user.manager.lastName}`,
              )
            : null,
        ),
    );
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

  async getOwnProfile(id: number): Promise<UserDTOProfile> {
    const user = await this.repo.findOne({
      where: { id },
      relations: { department: true, jobRole: true },
    });
    if (!user)
      throw new AppError(
        `User not found with ID: ${id}`,
        StatusCodes.NOT_FOUND,
      );
    return new UserDTOProfile(
      user.id,
      user.firstName,
      user.lastName,
      user.email,
      user.role,
      user.annualLeaveAllowance,
      new UserDTORelation(user.department.id, user.department.name),
      new UserDTORelation(user.jobRole.id, user.jobRole.name),
    );
  }

  async changeOwnPassword(
    id: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.repo
      .createQueryBuilder("user")
      .addSelect(["user.password", "user.salt"])
      .where("user.id = :id", { id })
      .getOne();

    if (!user)
      throw new AppError(
        `User not found with ID: ${id}`,
        StatusCodes.NOT_FOUND,
      );

    if (
      !PasswordHandler.verifyPassword(currentPassword, user.password, user.salt)
    )
      throw new AppError(
        "Current password is incorrect",
        StatusCodes.UNAUTHORIZED,
      );

    const candidate = Object.assign(new User(), user, {
      password: newPassword,
    });
    const errors = await validate(candidate, { skipMissingProperties: true });
    if (errors.length > 0) {
      throw new AppError(
        errors.map((e) => Object.values(e.constraints ?? {})).join(", "),
        StatusCodes.UNPROCESSABLE_ENTITY,
      );
    }

    const { hashedPassword, salt } = PasswordHandler.hashPassword(newPassword);
    user.password = hashedPassword;
    user.salt = salt;
    await this.repo.save(user);
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
    const saved = await this.saveUser(user);
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
    await this.saveUser(user);
    return (await this.repo.findOneBy({ id }))!;
  }

  async delete(id: number): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0)
      throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }
}
