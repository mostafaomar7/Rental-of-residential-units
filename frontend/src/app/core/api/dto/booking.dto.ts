import { ApiDate, ApiInstant, ApiTime, Bilingual, Uuid } from '../api.types';
import { CodedRef, GeoPoint, PolicyCancellation, QuotePricing } from './property.dto';

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'NO_SHOW';

export type BookingGroup = 'upcoming' | 'past' | 'cancelled' | 'all';

export interface BookingNight {
  date: ApiDate;
  price: number;
  basePrice: number;
  discountPercent: number;
}

export interface BookingPricing {
  currency: 'SAR';
  nights: BookingNight[];
  originalAmount: number;
  discount: number;
  promo: { code: string; discount: number } | null;
  accommodation: number;
  cleaningFee: number;
  freeCleaningApplied: boolean;
  vatPercent: number;
  vat: number;
  total: number;
}

/** Policy snapshot the guest accepted. */
export interface BookingPolicy {
  version: string;
  acceptedAt: ApiInstant;
  checkInTime: ApiTime;
  checkOutTime: ApiTime;
  cancellation: PolicyCancellation;
  houseRulesAr: string | null;
  damagePolicyAr: string | null;
}

export type CancelledBy = 'GUEST' | 'HOST' | 'ADMIN' | 'SYSTEM';

export interface BookingCancellation {
  cancelledAt: ApiInstant;
  cancelledBy: CancelledBy;
  reason: string | null;
  refundPercent: number;
  refundAmount: number;
}

export interface BookingProperty extends Bilingual {
  id: Uuid;
  city: CodedRef | null;
  district: Bilingual | null;
  coverUrl: string | null;
}

export interface Booking {
  id: Uuid;
  /** Human-friendly number, e.g. `RW-7KQ2XP`. */
  number: string;
  status: BookingStatus;
  property: BookingProperty;
  unit: { id: Uuid; name: string };
  checkIn: ApiDate;
  checkOut: ApiDate;
  checkInTime: ApiTime;
  checkOutTime: ApiTime;
  nights: number;
  guests: number;
  guestName: string;
  guestMobile: string;
  specialRequests: string | null;
  pricing: BookingPricing;
  policy: BookingPolicy;
  /** Dates are held until then while `PENDING_PAYMENT`. */
  holdExpiresAt: ApiInstant | null;
  confirmedAt: ApiInstant | null;
  checkedInAt: ApiInstant | null;
  completedAt: ApiInstant | null;
  cancellation: BookingCancellation | null;
  createdAt: ApiInstant;
  /** Exact address — only once paid. */
  location: (Partial<GeoPoint> & { addressLine: string | null }) | null;
}

/** Host / admin view adds the booking account. */
export interface ManagedBooking extends Booking {
  account: { id: Uuid; fullName: string; mobile: string };
}

export interface CreateBookingBody {
  unitId: Uuid;
  checkIn: ApiDate;
  checkOut: ApiDate;
  guests: number;
  acceptPolicies: true;
  policyVersion: string;
  /** The total the guest saw — the API answers `PRICE_CHANGED` if it moved. */
  expectedTotal?: number;
  useFreeCleaning?: boolean;
  promoCode?: string;
  utmCampaign?: string;
  guestName?: string;
  guestMobile?: string;
  specialRequests?: string;
}

/** `details` of a 409 `PRICE_CHANGED` / `POLICY_CHANGED`. */
export interface BookingConflictDetails {
  pricing?: QuotePricing;
  policy?: unknown;
  policyVersion?: string;
}

export interface CancellationPreview {
  hoursBeforeCheckIn: number;
  refundPercent: number;
  refundAmount: number;
  policyRefundAmount: number;
  rewardsReversal: { points: number; cashback: number; deductedFromRefund: number };
  paid: boolean;
  total: number;
}

// ---------- payments ----------

export type PaymentMethod = 'GATEWAY' | 'WALLET';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type PaymentPurpose = 'BOOKING' | 'WALLET_TOPUP';

export interface Payment {
  id: Uuid;
  purpose: PaymentPurpose;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  refundedAmount: number;
  currency: 'SAR';
  bookingId: Uuid | null;
  /** Redirect the browser here for GATEWAY payments. */
  paymentUrl: string | null;
  cardScheme: string | null;
  cardLast4: string | null;
  failureReason: string | null;
  paidAt: ApiInstant | null;
  createdAt: ApiInstant;
}

export interface PromoPreview {
  code: string;
  descriptionAr: string | null;
  discount: number;
  pricing: QuotePricing;
  issues: unknown[];
}

export interface PromoPreviewBody {
  code: string;
  unitId: Uuid;
  checkIn: ApiDate;
  checkOut: ApiDate;
  guests?: number;
}

// ---------- invoice ----------

export interface Invoice {
  number: string;
  issuedAt: ApiInstant;
  bookingNumber: string;
  seller: { nameAr: string; nameEn: string; crNumber: string; addressAr: string; vatNumber: string };
  buyer: { name: string; mobile: string };
  lines: { amount: number; quantity: number; descriptionAr: string; descriptionEn: string }[];
  subtotal: number;
  vatPercent: number;
  vat: number;
  total: number;
  currency: 'SAR';
  /** ZATCA TLV QR payload (base64). */
  qrCode: string;
}

// ---------- stay, digital key, compliance ----------

export type AccessStatus =
  | 'ACTIVE'
  | 'PENDING'
  | 'PREPARING'
  | 'NOT_AVAILABLE'
  | 'IDENTITY_REQUIRED'
  | 'COMPLIANCE_PENDING'
  | 'COMPLIANCE_FAILED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'FAILED';

export interface Access {
  available: boolean;
  status: AccessStatus;
  mode?: 'ONLINE' | 'OFFLINE';
  validFrom?: ApiInstant;
  validTo?: ApiInstant;
  codeMasked?: string;
  canReveal?: boolean;
  canUnlock?: boolean;
  lock?: { provider: string; model: string | null };
}

export interface DoorCode {
  code: string;
  validFrom: ApiInstant;
  validTo: ApiInstant;
  mode: 'ONLINE' | 'OFFLINE';
}

/** Unlike the other endpoints, the stay screen sends city/district as display names and `{ lat, lng }`. */
export interface StayProperty extends Bilingual {
  city: string | null;
  district: string | null;
  address: string | null;
  location: { lat: number; lng: number } | null;
  guideAr: string | null;
  houseRulesAr: string | null;
}

export interface Stay {
  bookingId: Uuid;
  bookingNumber: string;
  status: BookingStatus;
  property: StayProperty;
  unit: { name: string };
  wifi: { ssid: string; password: string } | null;
  checkIn: { date: ApiDate; time: ApiTime };
  checkOut: { date: ApiDate; time: ApiTime };
  access: Access;
  support: { whatsapp: string | null };
}

export interface Compliance {
  identity: { provided: boolean; type: string | null; verified: boolean; required: boolean };
  shomoos: { status: string; reference: string | null; registeredAt: ApiInstant | null; blocksKey: boolean } | null;
  keyHold: string | null;
}

export type StayRequestType = 'EARLY_CHECK_IN' | 'LATE_CHECK_OUT';
export type StayRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface StayRequest {
  id: Uuid;
  bookingId: Uuid;
  bookingNumber: string;
  type: StayRequestType;
  requestedTime: ApiTime;
  fee: number;
  status: StayRequestStatus;
  reason: string | null;
  decidedAt: ApiInstant | null;
  createdAt: ApiInstant;
}
