import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { User } from "../../domain/entities/User";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../domain/constants/collections";
import { UserMapper } from "../mappers/UserMapper";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export class FirestoreUserRepository implements UserRepository {
  private collectionName = COLLECTIONS.USERS;

  async getById(id: string): Promise<User | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return UserMapper.toDomain(docSnap.id, docSnap.data());
  }

  async update(id: string, user: Partial<User>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, user as any);
  }
}
