import type { Review } from "../../domain/entities/Review";

export class ReviewMapper {
  static toDomain(id: string, data: any): Review {
    return {
      id,
      transactionId: data.transactionId || undefined,
      reviewerId: data.reviewerId || "",
      reviewerName: data.reviewerName || "",
      reviewerPhotoURL: data.reviewerPhotoURL,
      reviewedUserId: data.reviewedUserId || "",
      reviewedUserName: data.reviewedUserName || "",
      rating: data.rating ?? 0,
      comment: data.comment ?? null,
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt),
    };
  }

  private static toDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    if (typeof timestamp?.toDate === "function") return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return new Date(timestamp);
  }
}
