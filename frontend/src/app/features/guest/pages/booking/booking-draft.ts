import { Uuid } from '@api/api.types';
import { BookingPricing, QuotePricing } from '@api/dto';
import { StaySelection } from '../../utils/stay-dates';

/** Wizard steps in order (SRS BKG-02). */
export const BOOKING_STEPS = ['dates', 'guest', 'policies', 'payment', 'confirmation'] as const;
export type BookingStep = 1 | 2 | 3 | 4 | 5;

/** Everything the guest enters in the booking wizard before the booking exists. */
export interface BookingDraft extends StaySelection {
  unitId: Uuid;
  guestName: string;
  guestMobile: string;
  specialRequests: string;
  useFreeCleaning: boolean;
  /** House rules, damage and cancellation policy accepted (sent with `policyVersion`). */
  acceptPolicies: boolean;
}

/** A booking's stored pricing in the quote's shape, so one breakdown component shows both. */
export function bookingPricingAsQuote(pricing: BookingPricing): QuotePricing {
  return {
    currency: pricing.currency,
    originalAccommodation: pricing.originalAmount,
    discount: pricing.discount,
    accommodation: pricing.accommodation,
    cleaningFee: pricing.cleaningFee,
    cleaningWaived: pricing.freeCleaningApplied,
    subtotal: pricing.accommodation + (pricing.freeCleaningApplied ? 0 : pricing.cleaningFee),
    vatPercent: pricing.vatPercent,
    vat: pricing.vat,
    total: pricing.total,
    ...(pricing.promo ? { promo: pricing.promo } : {}),
  };
}
