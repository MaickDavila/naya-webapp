/**
 * Estado de una transaccion
 */
export type TransactionStatus = 'pending' | 'completed' | 'cancelled' | 'refunded' | 'disputed';

/**
 * Metodo de pago
 */
export type PaymentMethod = 'mercadopago' | 'card' | 'cash' | 'bank_transfer' | 'other';

/**
 * Direccion de envio
 */
export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

/**
 * Informacion de envio
 */
export interface ShippingInfo {
  address: ShippingAddress;
  carrier?: string;
  trackingNumber?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
}

/**
 * Modelo de Transaccion - Compatible con admin
 */
export interface Transaction {
  id: string;
  
  // Producto
  productId: string;
  productName: string;
  productImage: string | null;
  
  // Comprador
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  
  // Vendedor
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  
  // Montos
  amount: number;
  currency: string;
  commission: number;
  sellerAmount: number;
  
  // Estado
  status: TransactionStatus;
  
  // Pago
  paymentMethod: PaymentMethod;
  paymentId?: string;
  paymentProvider?: string;
  
  // Fechas
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  refundedAt?: Date;
  
  // Envio
  shipping?: ShippingInfo;
  
  // Notas
  notes?: string;
  disputeReason?: string;
  refundReason?: string;
  refundedBy?: string;
}

/**
 * Item del carrito para checkout
 */
export interface CheckoutItem {
  id: string;
  title: string;
  description?: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  sellerId: string;
  sellerName: string;
}

/**
 * Request para crear preferencia de pago
 */
export interface CreatePreferenceRequest {
  items: CheckoutItem[];
  buyer: {
    id: string;
    name: string;
    email: string;
  };
  baseUrl: string;
}

/**
 * Respuesta de crear preferencia
 */
export interface CreatePreferenceResponse {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
}
