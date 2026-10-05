import { Injectable } from '@angular/core';
import { Uuid } from '@api/api.types';
import { Payment } from '@api/dto';

const PENDING_PAYMENT_KEY = 'rawaaf_pending_payment';

/**
 * Hand-off to the payment gateway. The payment id is remembered for the tab so the development
 * gateway page (`/test-gateway/:cartId`) can complete it; the gateway itself returns the browser
 * to `/payments/:paymentId/result`.
 */
@Injectable({ providedIn: 'root' })
export class PaymentRedirectService {
  /** Leaves the app for the gateway. Returns `false` when the payment has no gateway URL. */
  redirect(payment: Payment): boolean {
    if (!payment.paymentUrl) return false;
    try {
      sessionStorage.setItem(PENDING_PAYMENT_KEY, payment.id);
    } catch {
      // Storage unavailable — only the development gateway page needs it.
    }
    window.location.assign(payment.paymentUrl);
    return true;
  }

  pendingPaymentId(): Uuid | null {
    try {
      return sessionStorage.getItem(PENDING_PAYMENT_KEY);
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      sessionStorage.removeItem(PENDING_PAYMENT_KEY);
    } catch {
      // ignore
    }
  }
}
