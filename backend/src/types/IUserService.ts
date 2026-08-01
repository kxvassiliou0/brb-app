import type { User } from "../entities/User.entity.ts";

export interface IUserService {
  getAll(): Promise<Array<User>>;
  getById(id: number): Promise<User>;
  create(data: Partial<User>): Promise<User>;
  update(id: number, data: Partial<User>): Promise<User>;
  delete(id: number): Promise<void>;
}
