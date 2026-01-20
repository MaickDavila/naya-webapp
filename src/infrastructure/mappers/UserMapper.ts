import type { User } from "../../domain/entities/User";
import { Timestamp } from "firebase/firestore";

export class UserMapper {
  static toDomain(id: string, data: any): User {
    return {
      id,
      name: data.name || "",
      email: data.email || "",
      photoURL: data.photoURL,
      biography: data.biography || data.bio, // Manejamos ambos por si acaso
      location: data.location,
      createdAt: this.toDate(data.createdAt),
      rating: data.rating || 0,
      reviewsCount: data.reviewsCount || 0,
      displayName: data.displayName,
    };
  }

  static toPersistence(user: User): Record<string, any> {
    return {
      name: user.name,
      email: user.email,
      photoURL: user.photoURL || null,
      biography: user.biography || null,
      location: user.location || null,
      createdAt: Timestamp.fromDate(user.createdAt),
      rating: user.rating || 0,
      reviewsCount: user.reviewsCount || 0,
      displayName: user.displayName || null,
    };
  }

  private static toDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    if (typeof timestamp.toDate === "function") return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return new Date(timestamp);
  }
}
