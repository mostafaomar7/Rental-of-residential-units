import { ApiDate, ApiInstant, Bilingual, PageQuery, Uuid } from '../api.types';
import { CancellationRule } from './catalog.dto';
import { PropertyStatus } from './property.dto';
import { PaymentPurpose, PaymentStatus } from './booking.dto';
import { Role, User, UserStatus } from './user.dto';

// ---------- users ----------

export interface AdminUser extends User {
  lastLoginAt: ApiInstant | null;
  lockedUntil: ApiInstant | null;
}

export interface AdminUsersQuery extends PageQuery {
  role?: Role;
  status?: UserStatus;
  search?: string;
}

export interface InviteUserBody {
  mobile: string;
  fullName: string;
  email?: string | null;
  role: Exclude<Role, 'GUEST'>;
}

// ---------- property review queue (rows: `PropertyRow`) ----------

export interface AdminPropertiesQuery extends PageQuery {
  status?: PropertyStatus;
  cityId?: Uuid;
  ownerId?: Uuid;
  search?: string;
}

// ---------- booking money split ----------

export interface BookingFinancials {
  bookingId: Uuid;
  number: string;
  status: string;
  /** True while the stay is not completed yet. */
  projected: boolean;
  gross: number;
  vat: number;
  commissionBase: number;
  commissionPercent: number;
  commission: number;
  platformFunded: number;
  paymentFees: number;
  ownerNet: number;
  statementId: Uuid | null;
}

// ---------- payments & refunds ----------

export interface AdminPaymentsQuery extends PageQuery {
  status?: PaymentStatus;
  purpose?: PaymentPurpose;
  userId?: Uuid;
  bookingId?: Uuid;
}

export type RefundStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';

export interface Refund {
  id: Uuid;
  paymentId: Uuid;
  bookingId: Uuid | null;
  amount: number;
  destination: 'ORIGINAL' | 'WALLET' | string;
  status: RefundStatus;
  reason: string | null;
  gatewayRef: string | null;
  failureReason: string | null;
  attempts: number;
  idempotencyKey: string;
  processedAt: ApiInstant | null;
  createdAt: ApiInstant;
}

export interface Payouts {
  items: {
    owner: { id: Uuid; fullName: string; mobile: string };
    bankAccount: { status: string; ibanLast4: string } | null;
    unpaidStatements: number;
    dueNow: number;
    accruing: number;
    total: number;
  }[];
  totals: { dueNow: number; accruing: number; total: number };
}

// ---------- campaigns & promo codes ----------

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export interface Campaign {
  id: Uuid;
  name: string;
  goal: string | null;
  channel: string;
  utmCampaign: string;
  budget: number;
  spend: number;
  audience: Record<string, unknown> | null;
  startsOn: ApiDate;
  endsOn: ApiDate;
  status: CampaignStatus;
  isRunning: boolean;
  properties?: { id: Uuid; nameAr: string }[];
  promoCodes?: { id: Uuid; code: string; isActive: boolean }[];
  createdAt: ApiInstant;
}

export interface CampaignBody {
  name?: string;
  goal?: string | null;
  channel?: string;
  utmCampaign?: string;
  budget?: number;
  spend?: number;
  audience?: Record<string, unknown> | null;
  startsOn?: ApiDate;
  endsOn?: ApiDate;
  status?: CampaignStatus;
  propertyIds?: Uuid[];
}

export interface CampaignPerformance {
  campaign: Campaign;
  totals: {
    impressions: number;
    visits: number;
    bookings: number;
    cancelledBookings: number;
    revenue: number;
    promoDiscount: number;
    spend: number;
    budgetUsedPercent: number | null;
    clickThroughRate: number | null;
    conversionRate: number | null;
    costPerBooking: number | null;
    roas: number | null;
  };
  daily: { date: ApiDate; impressions: number; visits: number; bookings: number; revenue: number }[];
}

export interface PromoCode {
  id: Uuid;
  code: string;
  campaign: { id: Uuid; name: string } | null;
  descriptionAr: string | null;
  discountType: 'PERCENT' | 'FIXED';
  value: number;
  maxDiscount: number | null;
  minAccommodation: number | null;
  startsAt: ApiInstant;
  endsAt: ApiInstant;
  usageLimit: number | null;
  perUserLimit: number;
  firstBookingOnly: boolean;
  propertyIds: Uuid[];
  fundedBy: 'PLATFORM' | 'OWNER';
  isActive: boolean;
  usage?: { redeemed: number; held: number; released: number; discountGiven: number };
  createdAt: ApiInstant;
}

export type PromoCodeBody = Partial<Omit<PromoCode, 'id' | 'campaign' | 'usage' | 'createdAt'>> & { campaignId?: Uuid | null };

// ---------- settings & notifications ----------

export interface PlatformSetting<T = unknown> {
  key: string;
  value: T;
  default: T;
  public: boolean;
  description: string;
}

export interface NotificationTemplate {
  key: string;
  channels: ('SMS' | 'WHATSAPP' | 'EMAIL')[];
  critical: boolean;
  whatsappTemplate: string | null;
  variables: string[];
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  default: { titleAr: string; titleEn: string; bodyAr: string; bodyEn: string };
  isCustomised: boolean;
  updatedAt: ApiInstant | null;
}

export interface NotificationDelivery {
  id: Uuid;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED';
  template: string;
  userId: Uuid;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: ApiInstant | null;
  sentAt: ApiInstant | null;
  createdAt: ApiInstant;
}

// ---------- integrations (Nafath / Shomoos / Ewaa) ----------

export type IntegrationProvider = 'NAFATH' | 'SHOMOOS' | 'EWAA';
export type IntegrationCallStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'DEAD';

/**
 * OK; DEGRADED — more failed than successful calls in 24 h; ATTENTION — calls failed after every
 * retry and need a manual retry; NOT_CONFIGURED — integration switched off (no contract / keys yet).
 */
export type IntegrationHealthStatus = 'OK' | 'DEGRADED' | 'ATTENTION' | 'NOT_CONFIGURED';

export interface IntegrationHealth {
  provider: IntegrationProvider;
  driver: string;
  status: IntegrationHealthStatus;
  lastSuccessAt: ApiInstant | null;
  lastFailureAt: ApiInstant | null;
  lastError: string | null;
  queue: { pending: number; running: number; dead: number };
  last24h: { succeeded: number; failed: number; avgDurationMs: number | null };
}

export interface IntegrationCall {
  id: Uuid;
  provider: IntegrationProvider;
  operation: string;
  entityType: string;
  entityId: string;
  status: IntegrationCallStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: ApiInstant | null;
  externalRef: string | null;
  lastError: string | null;
  payload: unknown;
  response: unknown;
  succeededAt: ApiInstant | null;
  createdAt: ApiInstant;
  updatedAt: ApiInstant;
  attemptsLog?: { number: number; ok: boolean; error: string | null; response: unknown; durationMs: number; at: ApiInstant }[];
}

export interface IntegrationCallsQuery extends PageQuery {
  provider?: IntegrationProvider;
  status?: IntegrationCallStatus;
  operation?: string;
  entityId?: string;
}

// ---------- pricing events ----------

export type PricingEventType = 'HOLIDAY' | 'EVENT' | 'SEASON' | 'SCHOOL_HOLIDAY' | 'OTHER';

export interface PricingEvent {
  id: Uuid;
  nameAr: string;
  nameEn: string;
  type: PricingEventType;
  startDate: ApiDate;
  endDate: ApiDate;
  cityIds: Uuid[];
  upliftPercent: number;
  isActive: boolean;
}

export type PricingEventBody = Partial<Omit<PricingEvent, 'id'>>;

// ---------- audit ----------

export interface AuditLog {
  id: Uuid;
  actorId: Uuid | null;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ip: string | null;
  createdAt: ApiInstant;
}

export interface AuditLogsQuery extends PageQuery {
  entityType?: string;
  entityId?: string;
  actorId?: Uuid;
  action?: string;
  from?: ApiInstant;
  to?: ApiInstant;
}

// ---------- catalog administration ----------

export interface AdminCity extends Bilingual {
  id: Uuid;
  slug: string;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminDistrict extends Bilingual {
  id: Uuid;
  cityId: Uuid;
  isActive: boolean;
}

export interface AdminCatalogItem extends Bilingual {
  id: Uuid;
  code: string;
  icon?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminCancellationPolicy extends AdminCatalogItem {
  descriptionAr: string;
  descriptionEn: string;
  rules: CancellationRule[];
}

export interface CatalogListQuery {
  isActive?: boolean;
  search?: string;
}
