import type { Department } from "../entities/Department.entity.ts";

export interface IDepartmentService {
  getAll(): Promise<Array<Department>>;
  getById(id: number): Promise<Department>;
  create(name: string): Promise<Department>;
  update(id: number, name: string | undefined): Promise<Department>;
  delete(id: number): Promise<void>;
}
