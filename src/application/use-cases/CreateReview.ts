import type { ReviewRepository } from "../../domain/repositories/ReviewRepository";

export interface CreateReviewInput {
  reviewerId: string;
  reviewerName: string;
  reviewerPhotoURL?: string;
  reviewedUserId: string;
  reviewedUserName: string;
  rating: number;
  comment: string | null;
}

export class CreateReview {
  constructor(private reviewRepository: ReviewRepository) {}

  async execute(input: CreateReviewInput): Promise<string> {
    return this.reviewRepository.create({
      reviewerId: input.reviewerId,
      reviewerName: input.reviewerName,
      reviewerPhotoURL: input.reviewerPhotoURL,
      reviewedUserId: input.reviewedUserId,
      reviewedUserName: input.reviewedUserName,
      rating: Math.max(1, Math.min(5, input.rating)),
      comment: input.comment?.trim() || null,
    });
  }
}
