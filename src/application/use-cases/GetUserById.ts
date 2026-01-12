import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { User } from "../../domain/entities/User";

export class GetUserById {
  constructor(private userRepository: UserRepository) {}

  async execute(id: string): Promise<User | null> {
    return await this.userRepository.getById(id);
  }
}
