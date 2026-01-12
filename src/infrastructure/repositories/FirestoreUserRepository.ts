import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { User } from "../../domain/entities/User";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../domain/constants/collections";
import { UserMapper } from "../mappers/UserMapper";
import { doc, getDoc, updateDoc } from "firebase/firestore/lite";

export class FirestoreUserRepository implements UserRepository {
  private collectionName = COLLECTIONS.USERS;

  async getById(id: string): Promise<User | null> {
    if (!db || !id || typeof id !== "string" || id.trim() === "") {
      return null;
    }
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;

      return UserMapper.toDomain(docSnap.id, docSnap.data());
    } catch (error) {
      console.error("Error in getUserById:", error);
      return null;
    }
  }

  async update(id: string, user: Partial<User>): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, user as any);
  }
}
