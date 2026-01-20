import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { User } from "../../domain/entities/User";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../domain/constants/collections";
import { UserMapper } from "../mappers/UserMapper";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export class FirestoreUserRepository implements UserRepository {
  private collectionName = COLLECTIONS.USERS;

  async getById(id: string): Promise<User | null> {
    if (!id || typeof id !== "string" || id.trim() === "") {
      return null;
    }
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return UserMapper.toDomain(docSnap.id, docSnap.data());
  }

  async create(user: User): Promise<void> {
    const docRef = doc(db, this.collectionName, user.id);
    const data = UserMapper.toPersistence(user);
    await setDoc(docRef, data);
  }

  async update(id: string, user: Partial<User>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, user as any);
  }

  async getOrCreate(id: string, userData: Omit<User, 'id'>): Promise<User> {
    const existingUser = await this.getById(id);
    
    if (existingUser) {
      return existingUser;
    }

    // Crear nuevo usuario
    const newUser: User = {
      id,
      ...userData,
    };

    await this.create(newUser);
    return newUser;
  }
}
