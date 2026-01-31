import type { ProductRepository, ProductSearchFilters } from "../../domain/repositories/ProductRepository";
import type { Product, ProductStatus } from "../../domain/entities/Product";
import { COLLECTIONS } from "../../domain/constants/collections";
import { db } from "../../lib/firebase";
import { ProductMapper } from "../mappers/ProductMapper";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit as firestoreLimit,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  where,
  type QueryConstraint,
} from "firebase/firestore";

/**
 * Implementación del repositorio de productos usando Firestore
 * Compatible con la estructura del admin/backend
 */
export class FirestoreProductRepository implements ProductRepository {
  private collectionName = COLLECTIONS.PRODUCTS;

  /**
   * Obtiene los productos más recientes (solo aprobados por defecto para público)
   */
  async getLatest(limitCount: number): Promise<Product[]> {
    const productsRef = collection(db, this.collectionName);
    const q = query(
      productsRef,
      where("status", "==", "approved"),
      orderBy("publishedAt", "desc"),
      firestoreLimit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) =>
      ProductMapper.toDomain(doc.id, doc.data())
    );
  }

  /**
   * Obtiene un producto por su ID
   */
  async getById(id: string): Promise<Product | null> {
    if (!id || typeof id !== "string" || id.trim() === "") {
      return null;
    }
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return ProductMapper.toDomain(docSnap.id, docSnap.data());
  }

  /**
   * Obtiene todos los productos de un vendedor (todos los estados)
   */
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

  /**
   * Obtiene productos aprobados (visibles públicamente)
   */
  async getApproved(limitCount?: number): Promise<Product[]> {
    const productsRef = collection(db, this.collectionName);
    const constraints: QueryConstraint[] = [
      where("status", "==", "approved"),
      orderBy("publishedAt", "desc"),
    ];
    
    if (limitCount) {
      constraints.push(firestoreLimit(limitCount));
    }
    
    const q = query(productsRef, ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) =>
      ProductMapper.toDomain(doc.id, doc.data())
    );
  }

  /**
   * Obtiene productos pendientes de aprobación
   */
  async getPending(): Promise<Product[]> {
    const productsRef = collection(db, this.collectionName);
    const q = query(
      productsRef,
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) =>
      ProductMapper.toDomain(doc.id, doc.data())
    );
  }

  /**
   * Busca productos con filtros avanzados
   */
  async search(filters: ProductSearchFilters): Promise<Product[]> {
    const productsRef = collection(db, this.collectionName);
    const constraints: QueryConstraint[] = [];

    // Filtro por estado (por defecto solo aprobados para búsquedas públicas)
    if (filters.status) {
      constraints.push(where("status", "==", filters.status));
    } else {
      // Por defecto, mostrar solo productos aprobados en búsquedas públicas
      constraints.push(where("status", "==", "approved"));
    }

    // Filtro por categoría
    if (filters.category && filters.category !== "all") {
      constraints.push(where("category", "==", filters.category));
    }

    // Filtro por vendedor
    if (filters.sellerId) {
      constraints.push(where("sellerId", "==", filters.sellerId));
    }

    // Filtro por precio mínimo
    if (filters.minPrice !== undefined) {
      constraints.push(where("price", ">=", filters.minPrice));
    }

    // Filtro por precio máximo
    if (filters.maxPrice !== undefined) {
      constraints.push(where("price", "<=", filters.maxPrice));
    }

    // Ordenar: si hay filtros de precio, ordenar primero por precio (requerido por Firestore)
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      constraints.push(orderBy("price", "asc"));
    }

    // Ordenar por fecha
    constraints.push(orderBy("createdAt", "desc"));

    const q = query(productsRef, ...constraints);
    const snapshot = await getDocs(q);
    
    let products = snapshot.docs.map((doc) =>
      ProductMapper.toDomain(doc.id, doc.data())
    );

    // Búsqueda por texto (client-side por ahora - Firestore no soporta full-text search)
    if (filters.query) {
      const searchTerm = filters.query.toLowerCase();
      products = products.filter(
        (p) =>
          p.title.toLowerCase().includes(searchTerm) ||
          p.description.toLowerCase().includes(searchTerm) ||
          p.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
          (p.brand && p.brand.toLowerCase().includes(searchTerm))
      );
    }

    return products;
  }

  /**
   * Crea un nuevo producto
   */
  async create(product: Omit<Product, "id">): Promise<string> {
    const productsRef = collection(db, this.collectionName);
    const data = ProductMapper.toPersistence(product);

    // Añadir timestamps del servidor
    const docRef = await addDoc(productsRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  }

  /**
   * Actualiza un producto existente
   */
  async update(id: string, product: Partial<Product>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    const data = ProductMapper.toPersistence(product);

    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Elimina un producto
   */
  async delete(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await deleteDoc(docRef);
  }
}
