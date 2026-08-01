import type { JobRole } from "../entities/JobRole.entity.ts";

export interface IJobRoleService {
  getAll(): Promise<Array<JobRole>>;
  getById(id: number): Promise<JobRole>;
  create(name: string): Promise<JobRole>;
  update(id: number, name: string | undefined): Promise<JobRole>;
  delete(id: number): Promise<void>;
}
