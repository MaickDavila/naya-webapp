import type { ProductRepository } from "../../domain/repositories/ProductRepository";
import type { Product } from "../../domain/entities/Product";
import { COLLECTIONS } from "../../domain/constants/collections";
import { db } from "../../lib/firebase";
import { ProductMapper } from "../mappers/ProductMapper";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";

export class FirestoreProductRepository implements ProductRepository {
  private collectionName = COLLECTIONS.PRODUCTS;

  async getLatest(limitCount: number): Promise<Product[]> {
    const productsRef = collection(db, this.collectionName);
    const q = query(
      productsRef,
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) =>
      ProductMapper.toDomain(doc.id, doc.data())
    );
  }

  async getById(id: string): Promise<Product | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return ProductMapper.toDomain(docSnap.id, docSnap.data());
  }

  async getBySellerId(sellerId: string): Promise<Product[]> {
    const productsRef = collection(db, this.collectionName);
    const q = query(
      productsRef,
      where("sellerId", "==", sellerId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) =>
      ProductMapper.toDomain(doc.id, doc.data())
    );
  }

  async search(filters: {
    category?: string;
    query?: string;
  }): Promise<Product[]> {
    const productsRef = collection(db, this.collectionName);
    let q = query(productsRef, orderBy("createdAt", "desc"));

    if (filters.category && filters.category !== "all") {
      q = query(
        productsRef,
        where("category", "==", filters.category),
        orderBy("createdAt", "desc")
      );
    }

    const snapshot = await getDocs(q);
    let products = snapshot.docs.map((doc) =>
      ProductMapper.toDomain(doc.id, doc.data())
    );

    if (filters.query) {
      const searchTerm = filters.query.toLowerCase();
      products = products.filter(
        (p) =>
          p.title.toLowerCase().includes(searchTerm) ||
          p.description.toLowerCase().includes(searchTerm)
      );
    }

    return products;
  }

  async create(product: Omit<Product, "id">): Promise<string> {
    const productsRef = collection(db, this.collectionName);
    const data = ProductMapper.toPersistence(product);

    // Usamos el objeto de persistencia y añadimos los timestamps
    const docRef = await addDoc(productsRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  }

  async update(id: string, product: Partial<Product>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    const data = ProductMapper.toPersistence(product);

    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await deleteDoc(docRef);
  }
}
