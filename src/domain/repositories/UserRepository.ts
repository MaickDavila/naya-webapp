import type { User } from "../entities/User";

export interface UserRepository {
  getById(id: string): Promise<User | null>;
  create(user: User): Promise<void>;
  update(id: string, user: Partial<User>): Promise<void>;
  getOrCreate(id: string, userData: Omit<User, 'id'>): Promise<User>;
}
