import { validate } from "class-validator";
import { StatusCodes } from "http-status-codes";
import type { Repository } from "typeorm";
import { JobRole } from "../entities/JobRole.entity.ts";
import { AppError } from "../helpers/AppError.ts";
import type { IJobRoleService } from "../types/IJobRoleService.ts";

export class JobRoleService implements IJobRoleService {
  constructor(private readonly repo: Repository<JobRole>) {}

  async getAll(): Promise<Array<JobRole>> {
    return this.repo.find();
  }

  async getById(id: number): Promise<JobRole> {
    const jobRole = await this.repo.findOne({ where: { id } });
    if (!jobRole)
      throw new AppError(
        `Job role not found with ID: ${id}`,
        StatusCodes.NOT_FOUND,
      );
    return jobRole;
  }

  async create(name: string): Promise<JobRole> {
    const jobRole = new JobRole();
    jobRole.name = name;
    const errors = await validate(jobRole);
    if (errors.length > 0) {
      throw new AppError(
        errors.map((e) => Object.values(e.constraints ?? {})).join(", "),
        StatusCodes.UNPROCESSABLE_ENTITY,
      );
    }
    return this.repo.save(jobRole);
  }

  async update(id: number, name: string | undefined): Promise<JobRole> {
    const jobRole = await this.repo.findOneBy({ id });
    if (!jobRole)
      throw new AppError("Job role not found", StatusCodes.NOT_FOUND);
    if (name !== undefined) jobRole.name = name;
    const errors = await validate(jobRole);
    if (errors.length > 0) {
      throw new AppError(
        errors.map((e) => Object.values(e.constraints ?? {})).join(", "),
        StatusCodes.UNPROCESSABLE_ENTITY,
      );
    }
    return this.repo.save(jobRole);
  }

  async delete(id: number): Promise<void> {
    try {
      const result = await this.repo.delete(id);
      if (result.affected === 0)
        throw new AppError("Job role not found", StatusCodes.NOT_FOUND);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (
        error instanceof Error &&
        error.message.includes("foreign key constraint")
      ) {
        throw new AppError(
          "Cannot delete job role: one or more users are assigned to it",
          StatusCodes.CONFLICT,
        );
      }
      throw error;
    }
  }
}
