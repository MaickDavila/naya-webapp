import type { User } from "../../domain/entities/User";
import type { UserShippingAddress } from "../../domain/entities/ShippingAddress";
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
      favoriteProductIds: data.favoriteProductIds || [],
      shippingAddresses: this.mapShippingAddresses(data.shippingAddresses),
    };
  }

  private static mapShippingAddresses(addresses: any[]): UserShippingAddress[] {
    if (!addresses || !Array.isArray(addresses)) return [];
    return addresses.map((addr) => ({
      id: addr.id || "",
      label: addr.label || "",
      recipientName: addr.recipientName || "",
      phone: addr.phone || "",
      street: addr.street || "",
      number: addr.number || "",
      apartment: addr.apartment,
      district: addr.district || "",
      city: addr.city || "",
      state: addr.state || "",
      zipCode: addr.zipCode,
      country: addr.country || "Peru",
      reference: addr.reference,
      isDefault: addr.isDefault || false,
      createdAt: this.toDate(addr.createdAt),
    }));
  }

  static toPersistence(user: Partial<User>): Record<string, any> {
    const data: Record<string, any> = {};

    if (user.name !== undefined) data.name = user.name;
    if (user.email !== undefined) data.email = user.email;
    if (user.photoURL !== undefined) data.photoURL = user.photoURL || null;
    if (user.biography !== undefined) data.biography = user.biography || null;
    if (user.location !== undefined) data.location = user.location || null;
    if (user.createdAt !== undefined) data.createdAt = Timestamp.fromDate(user.createdAt);
    if (user.rating !== undefined) data.rating = user.rating || 0;
    if (user.reviewsCount !== undefined) data.reviewsCount = user.reviewsCount || 0;
    if (user.displayName !== undefined) data.displayName = user.displayName || null;
    if (user.favoriteProductIds !== undefined) data.favoriteProductIds = user.favoriteProductIds || [];
    if (user.shippingAddresses !== undefined) {
      data.shippingAddresses = user.shippingAddresses.map((addr) =>
        this.shippingAddressToPersistence(addr)
      );
    }

    return data;
  }

  /**
   * Serializa una direccion de envio para Firestore sin valores undefined (no permitidos).
   */
  private static shippingAddressToPersistence(addr: UserShippingAddress): Record<string, unknown> {
    const out: Record<string, unknown> = {
      id: addr.id,
      label: addr.label,
      recipientName: addr.recipientName,
      phone: addr.phone,
      street: addr.street,
      number: addr.number,
      district: addr.district,
      city: addr.city,
      state: addr.state,
      country: addr.country,
      isDefault: addr.isDefault,
      createdAt:
        addr.createdAt instanceof Date ? Timestamp.fromDate(addr.createdAt) : addr.createdAt,
    };
    if (addr.apartment != null && addr.apartment !== "") out.apartment = addr.apartment;
    if (addr.zipCode != null && addr.zipCode !== "") out.zipCode = addr.zipCode;
    if (addr.reference != null && addr.reference !== "") out.reference = addr.reference;
    return out;
  }

  private static toDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    if (typeof timestamp.toDate === "function") return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return new Date(timestamp);
  }
}
