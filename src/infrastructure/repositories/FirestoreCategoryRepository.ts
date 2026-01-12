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
} from "firebase/firestore/lite";

export class FirestoreCategoryRepository implements CategoryRepository {
  private collectionName = COLLECTIONS.CATEGORIES;

  async getAll(): Promise<Category[]> {
    if (!db) return [];
    try {
      const categoriesRef = collection(db, this.collectionName);
      const q = query(categoriesRef, orderBy("order", "asc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) =>
        CategoryMapper.toDomain(doc.id, doc.data())
      );
    } catch (error) {
      console.error("Error in getAll categories:", error);
      return [];
    }
  }

  async getActive(): Promise<Category[]> {
    if (!db) return [];
    try {
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
    } catch (error) {
      console.error("Error in getActive categories:", error);
      return [];
    }
  }

  async getById(id: string): Promise<Category | null> {
    if (!db || !id) return null;
    try {
      const categoriesRef = collection(db, this.collectionName);
      const q = query(categoriesRef, where("id", "==", id), limit(1));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return CategoryMapper.toDomain(doc.id, doc.data());
    } catch (error) {
      console.error("Error in getCategoryById:", error);
      return null;
    }
  }

  async getBySlug(slug: string): Promise<Category | null> {
    if (!db || !slug) return null;
    try {
      const categoriesRef = collection(db, this.collectionName);
      const q = query(categoriesRef, where("slug", "==", slug), limit(1));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return CategoryMapper.toDomain(doc.id, doc.data());
    } catch (error) {
      console.error("Error in getCategoryBySlug:", error);
      return null;
    }
  }
}
