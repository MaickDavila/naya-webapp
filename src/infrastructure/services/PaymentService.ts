import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../../lib/firebase';
import type { 
  CreatePreferenceRequest, 
  CreatePreferenceResponse,
  CheckoutItem 
} from '../../domain/entities/Transaction';

/**
 * Servicio para manejar pagos con MercadoPago
 */
export class PaymentService {
  private functions = getFunctions(app, 'us-central1');

  /**
   * Crea una preferencia de pago en MercadoPago
   * @param items Items del carrito
   * @param buyer Informacion del comprador
   * @returns URL de pago de MercadoPago
   */
  async createPreference(
    items: CheckoutItem[],
    buyer: { id: string; name: string; email: string }
  ): Promise<CreatePreferenceResponse> {
    const createPreferenceFn = httpsCallable<CreatePreferenceRequest, CreatePreferenceResponse>(
      this.functions,
      'createPreference'
    );

    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : import.meta.env.PUBLIC_BASE_URL || 'http://localhost:4321';

    const result = await createPreferenceFn({
      items,
      buyer,
      baseUrl,
    });

    return result.data;
  }

  /**
   * Redirige al usuario a MercadoPago para completar el pago
   * @param initPoint URL de pago de MercadoPago
   */
  redirectToPayment(initPoint: string): void {
    if (typeof window !== 'undefined') {
      window.location.href = initPoint;
    }
  }

  /**
   * Determina si estamos en modo sandbox/desarrollo
   */
  isSandboxMode(): boolean {
    return import.meta.env.DEV || import.meta.env.PUBLIC_MP_SANDBOX === 'true';
  }
}

export const paymentService = new PaymentService();
