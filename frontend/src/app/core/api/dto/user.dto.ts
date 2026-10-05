import { ApiDate, ApiInstant, Lang, Uuid } from '../api.types';

export type Role = 'GUEST' | 'OWNER' | 'OPERATOR' | 'SUPERVISOR' | 'PHOTOGRAPHER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export interface User {
  id: Uuid;
  mobile: string;
  email: string | null;
  fullName: string;
  role: Role;
  status: UserStatus;
  language: Lang;
  hasPassword: boolean;
  mobileVerified: boolean;
  nafathVerified: boolean;
  referralCode: string;
  createdAt: ApiInstant;
}

// ---------- auth ----------

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

export interface AuthSession {
  user: User;
  tokens: AuthTokens;
}

export interface OtpRequestResult {
  expiresInSeconds: number;
  resendAfterSeconds: number;
  /** Development backends only. */
  devCode?: string;
  isRegistered?: boolean;
}

export type OtpVerifyResult =
  | ({ isRegistered: true } & AuthSession)
  | { isRegistered: false; registrationToken: string };

export interface RegisterBody {
  registrationToken: string;
  fullName: string;
  email?: string | null;
  password?: string;
  referralCode?: string | null;
}

// ---------- profile ----------

export interface UpdateProfileBody {
  fullName?: string;
  email?: string;
  language?: Lang;
}

export interface NotificationPreferences {
  inApp: boolean;
  sms: boolean;
  whatsapp: boolean;
  email: boolean;
  hasEmail: boolean;
}

export interface AppNotification {
  id: Uuid;
  template: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  data: Record<string, unknown>;
  readAt: ApiInstant | null;
  createdAt: ApiInstant;
}

export interface NotificationsMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  unreadCount: number;
}

// ---------- wallet ----------

export type WalletTransactionType =
  | 'TOPUP'
  | 'BOOKING_PAYMENT'
  | 'REFUND'
  | 'CASHBACK'
  | 'CASHBACK_REVERSAL'
  | 'REWARD_REDEMPTION'
  | 'REFERRAL_BONUS'
  | 'ADJUSTMENT'
  | 'STAY_REQUEST_FEE'
  | 'DAMAGE_CHARGE';

export interface Wallet {
  balance: number;
  currency: 'SAR';
}

export interface WalletTransaction {
  id: Uuid;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  bookingId: Uuid | null;
  descriptionAr: string;
  descriptionEn: string;
  createdAt: ApiInstant;
}

// ---------- loyalty ----------

export type PointsTransactionType = 'WELCOME' | 'BOOKING' | 'BOOKING_REVERSAL' | 'REVIEW' | 'REDEMPTION' | 'ADJUSTMENT';

export interface LoyaltyTier {
  code: string;
  nameAr: string;
  nameEn: string;
  minPoints: number;
  cashbackPercent: number;
}

export interface Loyalty {
  points: { balance: number; lifetime: number };
  tier: LoyaltyTier;
  nextTier: (LoyaltyTier & { pointsNeeded: number }) | null;
  progressPercent: number;
  tiers: LoyaltyTier[];
  earning: { pointsPer100Sar: number; reviewPoints: number };
  redemption: { blockPoints: number; blockValue: number; redeemablePoints: number; redeemableValue: number };
  freeCleaning: { every: number; progress: number; available: number };
  referral: { code: string; bonus: number; invited: number; rewarded: number };
}

export interface PointsTransaction {
  id: Uuid;
  type: PointsTransactionType;
  points: number;
  balanceAfter: number;
  bookingId: Uuid | null;
  descriptionAr: string;
  descriptionEn: string;
  createdAt: ApiInstant;
}

export interface RedeemResult {
  pointsRedeemed: number;
  value: number;
  pointsBalance: number;
  walletBalance: number;
}

// ---------- identity ----------

export type IdentityType = 'NATIONAL_ID' | 'IQAMA' | 'PASSPORT' | 'GCC_ID';

export interface Identity {
  type: IdentityType;
  numberMasked: string;
  nationality: string;
  fullNameAr: string | null;
  fullNameEn: string | null;
  dateOfBirth: ApiDate;
  source: 'NAFATH' | 'MANUAL';
  verified: boolean;
  verifiedAt: ApiInstant | null;
}

export interface ManualIdentityBody {
  type: 'PASSPORT' | 'GCC_ID';
  number: string;
  nationality: string;
  dateOfBirth: ApiDate;
  fullNameEn?: string;
}

export type NafathStatus = 'WAITING' | 'COMPLETED' | 'REJECTED' | 'EXPIRED' | 'FAILED';

export interface NafathRequest {
  id: Uuid;
  status: NafathStatus;
  /** Number the user taps in the Nafath app (while WAITING). */
  random: string | null;
  expiresAt: ApiInstant;
  failureReason: string | null;
  completedAt: ApiInstant | null;
}
