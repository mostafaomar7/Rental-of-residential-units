import {
  AccessStatus,
  BankAccountStatus,
  BookingStatus,
  CampaignStatus,
  DamageStatus,
  IncidentSeverity,
  IncidentStatus,
  IntegrationCallStatus,
  IntegrationHealthStatus,
  NafathStatus,
  NotificationDelivery,
  PaymentStatus,
  PropertyStatus,
  RecommendationStatus,
  RefundStatus,
  StayRequestStatus,
  TaskStatus,
  UserStatus,
} from '@api/dto';

/** Semantic colour of a status pill; maps to `.pill-<tone>` in the design system. */
export type Tone = 'green' | 'navy' | 'gold' | 'amber' | 'blue' | 'red' | 'gray';

/**
 * Colour of every API status code (UPPER_CASE, as the backend sends them), per domain.
 * Labels live in i18n under `status.<domain>.<CODE>`. `Record<Code, Tone>` makes the compiler
 * flag any status the backend adds that has no colour yet.
 */
export const STATUS_TONES = {
  booking: {
    PENDING_PAYMENT: 'amber',
    CONFIRMED: 'green',
    CHECKED_IN: 'gold',
    COMPLETED: 'navy',
    CANCELLED: 'red',
    EXPIRED: 'gray',
    NO_SHOW: 'red',
  } satisfies Record<BookingStatus, Tone>,
  payment: {
    PENDING: 'amber',
    PAID: 'green',
    FAILED: 'red',
    CANCELLED: 'gray',
    REFUNDED: 'blue',
    PARTIALLY_REFUNDED: 'blue',
  } satisfies Record<PaymentStatus, Tone>,
  refund: { PENDING: 'amber', SUCCEEDED: 'green', FAILED: 'red' } satisfies Record<RefundStatus, Tone>,
  key: {
    ACTIVE: 'green',
    PENDING: 'amber',
    PREPARING: 'gold',
    NOT_AVAILABLE: 'gray',
    IDENTITY_REQUIRED: 'amber',
    COMPLIANCE_PENDING: 'amber',
    COMPLIANCE_FAILED: 'red',
    REVOKED: 'red',
    EXPIRED: 'navy',
    FAILED: 'red',
  } satisfies Record<AccessStatus, Tone>,
  property: {
    DRAFT: 'gray',
    PENDING_REVIEW: 'amber',
    PUBLISHED: 'green',
    REJECTED: 'red',
    SUSPENDED: 'red',
  } satisfies Record<PropertyStatus, Tone>,
  task: {
    TODO: 'gray',
    IN_PROGRESS: 'amber',
    SUBMITTED: 'gold',
    DONE: 'green',
    BLOCKED: 'red',
    CANCELLED: 'gray',
  } satisfies Record<TaskStatus, Tone>,
  incident: { OPEN: 'red', IN_PROGRESS: 'amber', RESOLVED: 'green' } satisfies Record<IncidentStatus, Tone>,
  severity: { LOW: 'blue', MEDIUM: 'amber', HIGH: 'red', CRITICAL: 'red' } satisfies Record<IncidentSeverity, Tone>,
  damage: {
    OPENED: 'gray',
    UNDER_REVIEW: 'amber',
    GUEST_NOTIFIED: 'amber',
    DISPUTED: 'red',
    APPROVED: 'green',
    REJECTED: 'red',
    SETTLED: 'navy',
    CLOSED: 'gray',
  } satisfies Record<DamageStatus, Tone>,
  stayRequest: { PENDING: 'amber', APPROVED: 'green', REJECTED: 'red', CANCELLED: 'gray' } satisfies Record<StayRequestStatus, Tone>,
  user: { ACTIVE: 'green', SUSPENDED: 'red' } satisfies Record<UserStatus, Tone>,
  campaign: { DRAFT: 'gray', ACTIVE: 'green', PAUSED: 'amber', ARCHIVED: 'navy' } satisfies Record<CampaignStatus, Tone>,
  statement: { ISSUED: 'gold', PAID: 'green' } satisfies Record<'ISSUED' | 'PAID', Tone>,
  bankAccount: { PENDING: 'amber', VERIFIED: 'green', REJECTED: 'red' } satisfies Record<BankAccountStatus, Tone>,
  recommendation: { PENDING: 'amber', APPLIED: 'green', REJECTED: 'red', EXPIRED: 'gray' } satisfies Record<RecommendationStatus, Tone>,
  integrationCall: {
    PENDING: 'amber',
    RUNNING: 'blue',
    SUCCEEDED: 'green',
    FAILED: 'red',
    DEAD: 'red',
  } satisfies Record<IntegrationCallStatus, Tone>,
  integrationHealth: { OK: 'green', DEGRADED: 'amber', ATTENTION: 'red', NOT_CONFIGURED: 'gray' } satisfies Record<IntegrationHealthStatus, Tone>,
  delivery: { PENDING: 'amber', SENDING: 'blue', SENT: 'green', FAILED: 'red' } satisfies Record<NotificationDelivery['status'], Tone>,
  review: { PUBLISHED: 'green', HIDDEN: 'red' } satisfies Record<'PUBLISHED' | 'HIDDEN', Tone>,
  /** Door access attempt (from `AccessLog.success`). */
  access: { success: 'green', failed: 'red' } satisfies Record<'success' | 'failed', Tone>,
  lock: { ONLINE: 'green', OFFLINE: 'red', UNKNOWN: 'gray' } satisfies Record<'ONLINE' | 'OFFLINE' | 'UNKNOWN', Tone>,
  nafath: { WAITING: 'amber', COMPLETED: 'green', REJECTED: 'red', EXPIRED: 'gray', FAILED: 'red' } satisfies Record<NafathStatus, Tone>,
} as const;

export type StatusDomain = keyof typeof STATUS_TONES;

export function statusTone(domain: StatusDomain, code: string): Tone {
  return (STATUS_TONES[domain] as Record<string, Tone>)[code] ?? 'gray';
}
