import type { UserRepository } from '../../domain/repositories/UserRepository';
import type { User } from '../../domain/entities/User';

export class GetSellers {
  constructor(private userRepository: UserRepository) {}

  async execute(): Promise<User[]> {
    return await this.userRepository.getSellers();
  }
}
