import type { ProductRepository } from '../../domain/repositories/ProductRepository';
import type { Product } from '../../domain/entities/Product';

export class GetProductById {
  constructor(private productRepository: ProductRepository) {}

  async execute(id: string): Promise<Product | null> {
    return await this.productRepository.getById(id);
  }
}
