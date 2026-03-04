import type { ReviewRepository } from "../../domain/repositories/ReviewRepository";
import type { Review } from "../../domain/entities/Review";
import { COLLECTIONS } from "../../domain/constants/collections";
import { db } from "../../lib/firebase";
import { ReviewMapper } from "../mappers/ReviewMapper";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

export class FirestoreReviewRepository implements ReviewRepository {
  private collectionName = COLLECTIONS.REVIEWS;

  async getByReviewedUserId(sellerId: string): Promise<Review[]> {
    if (!sellerId || typeof sellerId !== "string" || sellerId.trim() === "") {
      return [];
    }
    try {
      const reviewsRef = collection(db, this.collectionName);
      const q = query(
        reviewsRef,
        where("reviewedUserId", "==", sellerId)
      );

      const snapshot = await getDocs(q);
      const reviews = snapshot.docs.map((doc) =>
        ReviewMapper.toDomain(doc.id, doc.data())
      );
      return reviews.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    } catch {
      return [];
    }
  }

  async getByReviewerAndReviewedUser(
    reviewerId: string,
    reviewedUserId: string
  ): Promise<Review | null> {
    if (!reviewerId || !reviewedUserId) return null;
    try {
      const reviewsRef = collection(db, this.collectionName);
      const q = query(
        reviewsRef,
        where("reviewerId", "==", reviewerId),
        where("reviewedUserId", "==", reviewedUserId)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return ReviewMapper.toDomain(doc.id, doc.data());
    } catch {
      return null;
    }
  }

  async create(
    review: Omit<Review, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const reviewsRef = collection(db, this.collectionName);
    const data: Record<string, unknown> = {
      transactionId: review.transactionId || null,
      reviewerId: review.reviewerId,
      reviewerName: review.reviewerName,
      reviewerPhotoURL: review.reviewerPhotoURL || null,
      reviewedUserId: review.reviewedUserId,
      reviewedUserName: review.reviewedUserName,
      rating: review.rating,
      comment: review.comment || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(reviewsRef, data);
    return docRef.id;
  }
}
