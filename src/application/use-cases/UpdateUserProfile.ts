import type { UserRepository } from '../../domain/repositories/UserRepository';
import type { User } from '../../domain/entities/User';

export class UpdateUserProfile {
  constructor(private userRepository: UserRepository) {}

  async execute(id: string, data: Partial<User>): Promise<void> {
    await this.userRepository.update(id, data);
  }
}
