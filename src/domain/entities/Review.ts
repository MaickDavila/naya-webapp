export interface Review {
  id: string;
  transactionId?: string;
  reviewerId: string;
  reviewerName: string;
  reviewerPhotoURL?: string;
  reviewedUserId: string;
  reviewedUserName: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}
