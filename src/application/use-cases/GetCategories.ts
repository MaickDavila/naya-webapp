import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';
import type { Category } from '../../domain/entities/Category';

export class GetCategories {
  constructor(private categoryRepository: CategoryRepository) {}

  async execute(): Promise<Category[]> {
    return await this.categoryRepository.getActive();
  }
}
