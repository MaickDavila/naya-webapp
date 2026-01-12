import type { User } from "../entities/User";

export interface UserRepository {
  getById(id: string): Promise<User | null>;
  update(id: string, user: Partial<User>): Promise<void>;
}
