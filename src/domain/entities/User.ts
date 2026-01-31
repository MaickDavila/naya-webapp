import type { UserShippingAddress } from "./ShippingAddress";

export interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  biography?: string;
  location?: string;
  createdAt: Date;
  rating?: number;
  reviewsCount?: number;
  displayName?: string;
  favoriteProductIds?: string[];
  shippingAddresses?: UserShippingAddress[];
}
