import type { CategoryRepository } from "../../domain/repositories/CategoryRepository";
import type { Category } from "../../domain/entities/Category";
import { COLLECTIONS } from "../../domain/constants/collections";
import { db } from "../../lib/firebase";
import { CategoryMapper } from "../mappers/CategoryMapper";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  limit,
} from "firebase/firestore";

export class FirestoreCategoryRepository implements CategoryRepository {
  private collectionName = COLLECTIONS.CATEGORIES;

  async getAll(): Promise<Category[]> {
    const categoriesRef = collection(db, this.collectionName);
    const q = query(categoriesRef, orderBy("order", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) =>
      CategoryMapper.toDomain(doc.id, doc.data())
    );
  }

  async getActive(): Promise<Category[]> {
    const categoriesRef = collection(db, this.collectionName);
    const q = query(
      categoriesRef,
      where("active", "==", true),
      orderBy("order", "asc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) =>
      CategoryMapper.toDomain(doc.id, doc.data())
    );
  }

  async getById(id: string): Promise<Category | null> {
    const categoriesRef = collection(db, this.collectionName);
    const q = query(categoriesRef, where("id", "==", id), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return CategoryMapper.toDomain(doc.id, doc.data());
  }

  async getBySlug(slug: string): Promise<Category | null> {
    const categoriesRef = collection(db, this.collectionName);
    const q = query(categoriesRef, where("slug", "==", slug), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return CategoryMapper.toDomain(doc.id, doc.data());
  }
}
