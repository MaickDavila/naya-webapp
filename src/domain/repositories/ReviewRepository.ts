import type { Review } from "../entities/Review";

export interface ReviewRepository {
  /**
   * Obtiene todas las reseñas de un vendedor (donde reviewedUserId = sellerId)
   */
  getByReviewedUserId(sellerId: string): Promise<Review[]>;

  /**
   * Obtiene la reseña de un usuario específico a un vendedor (si existe)
   */
  getByReviewerAndReviewedUser(
    reviewerId: string,
    reviewedUserId: string
  ): Promise<Review | null>;

  /**
   * Crea una nueva reseña. Retorna el ID del documento creado.
   */
  create(review: Omit<Review, "id" | "createdAt" | "updatedAt">): Promise<string>;
}
