import type { ProductRepository } from '../../domain/repositories/ProductRepository';
import type { Product } from '../../domain/entities/Product';

export class GetProductsBySeller {
  constructor(private productRepository: ProductRepository) {}

  async execute(sellerId: string): Promise<Product[]> {
    return await this.productRepository.getBySellerId(sellerId);
  }
}
