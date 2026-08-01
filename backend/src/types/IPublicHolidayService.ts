import type { PublicHoliday } from "../entities/PublicHoliday.entity.ts";

export interface IPublicHolidayService {
  getAll(): Promise<Array<PublicHoliday>>;
  getById(id: number): Promise<PublicHoliday>;
  create(date: string, name: string): Promise<PublicHoliday>;
  update(
    id: number,
    data: { date?: string; name?: string },
  ): Promise<PublicHoliday>;
  delete(id: number): Promise<void>;
}
