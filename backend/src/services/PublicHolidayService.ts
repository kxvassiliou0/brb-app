import { validate } from "class-validator";
import { StatusCodes } from "http-status-codes";
import type { Repository } from "typeorm";
import { PublicHoliday } from "../entities/PublicHoliday.entity.ts";
import { AppError } from "../helpers/AppError.ts";
import type { IPublicHolidayService } from "../types/IPublicHolidayService.ts";

export class PublicHolidayService implements IPublicHolidayService {
  constructor(private readonly repo: Repository<PublicHoliday>) {}

  async getAll(): Promise<Array<PublicHoliday>> {
    return this.repo.find({ order: { date: "ASC" } });
  }

  async getById(id: number): Promise<PublicHoliday> {
    const holiday = await this.repo.findOne({ where: { id } });
    if (!holiday)
      throw new AppError(
        `Public holiday not found with ID: ${id}`,
        StatusCodes.NOT_FOUND,
      );
    return holiday;
  }

  async create(date: string, name: string): Promise<PublicHoliday> {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime()))
      throw new AppError("Invalid date format", StatusCodes.BAD_REQUEST);
    const holiday = new PublicHoliday();
    holiday.date = parsed;
    holiday.name = name;
    const errors = await validate(holiday);
    if (errors.length > 0) {
      throw new AppError(
        errors.map((e) => Object.values(e.constraints ?? {})).join(", "),
        StatusCodes.UNPROCESSABLE_ENTITY,
      );
    }
    return this.repo.save(holiday);
  }

  async update(
    id: number,
    data: { date?: string; name?: string },
  ): Promise<PublicHoliday> {
    const holiday = await this.repo.findOneBy({ id });
    if (!holiday)
      throw new AppError("Public holiday not found", StatusCodes.NOT_FOUND);
    if (data.date !== undefined) {
      const parsed = new Date(data.date);
      if (isNaN(parsed.getTime()))
        throw new AppError("Invalid date format", StatusCodes.BAD_REQUEST);
      holiday.date = parsed;
    }
    if (data.name !== undefined) holiday.name = data.name;
    const errors = await validate(holiday);
    if (errors.length > 0) {
      throw new AppError(
        errors.map((e) => Object.values(e.constraints ?? {})).join(", "),
        StatusCodes.UNPROCESSABLE_ENTITY,
      );
    }
    return this.repo.save(holiday);
  }

  async delete(id: number): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0)
      throw new AppError("Public holiday not found", StatusCodes.NOT_FOUND);
  }
}
