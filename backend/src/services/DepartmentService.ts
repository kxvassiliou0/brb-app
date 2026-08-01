import { validate } from "class-validator";
import { StatusCodes } from "http-status-codes";
import type { Repository } from "typeorm";
import { Department } from "../entities/Department.entity.ts";
import { AppError } from "../helpers/AppError.ts";
import type { IDepartmentService } from "../types/IDepartmentService.ts";

export class DepartmentService implements IDepartmentService {
  constructor(private readonly repo: Repository<Department>) {}

  async getAll(): Promise<Array<Department>> {
    return this.repo.find();
  }

  async getById(id: number): Promise<Department> {
    const department = await this.repo.findOne({ where: { id } });
    if (!department)
      throw new AppError(
        `Department not found with ID: ${id}`,
        StatusCodes.NOT_FOUND,
      );
    return department;
  }

  async create(name: string): Promise<Department> {
    const department = new Department();
    department.name = name;
    const errors = await validate(department);
    if (errors.length > 0) {
      throw new AppError(
        errors.map((e) => Object.values(e.constraints ?? {})).join(", "),
        StatusCodes.UNPROCESSABLE_ENTITY,
      );
    }
    return this.repo.save(department);
  }

  async update(id: number, name: string | undefined): Promise<Department> {
    const department = await this.repo.findOneBy({ id });
    if (!department)
      throw new AppError("Department not found", StatusCodes.NOT_FOUND);
    if (name !== undefined) department.name = name;
    const errors = await validate(department);
    if (errors.length > 0) {
      throw new AppError(
        errors.map((e) => Object.values(e.constraints ?? {})).join(", "),
        StatusCodes.UNPROCESSABLE_ENTITY,
      );
    }
    return this.repo.save(department);
  }

  async delete(id: number): Promise<void> {
    try {
      const result = await this.repo.delete(id);
      if (result.affected === 0)
        throw new AppError("Department not found", StatusCodes.NOT_FOUND);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (
        error instanceof Error &&
        error.message.includes("foreign key constraint")
      ) {
        throw new AppError(
          "Cannot delete department: one or more users are assigned to it",
          StatusCodes.CONFLICT,
        );
      }
      throw error;
    }
  }
}
