import type { UserDTOProfile } from "../dto/UserDTOProfile.ts";
import type { User } from "../entities/User.entity.ts";

export interface IUserService {
  getAll(): Promise<Array<User>>;
  getById(id: number): Promise<User>;
  getOwnProfile(id: number): Promise<UserDTOProfile>;
  create(data: Partial<User>): Promise<User>;
  update(id: number, data: Partial<User>): Promise<User>;
  delete(id: number): Promise<void>;
}
