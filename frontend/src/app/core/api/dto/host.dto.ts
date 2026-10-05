import { ApiDate, ApiInstant, ApiTime, Bilingual, PageMeta, PageQuery, Uuid } from '../api.types';
import { Amenity, CancellationRule, District, PropertyType } from './catalog.dto';
import { OperatingModel, Photo, PropertyStatus } from './property.dto';
import { BookingStatus } from './booking.dto';
import { TaskStatus, TaskType } from './operations.dto';

// ---------- property management ----------

export interface CityRef extends Bilingual {
  id: Uuid;
  code: string;
}

export interface ManagedUnit {
  id: Uuid;
  name: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  areaSqm: number | null;
  basePrice: number;
  cleaningFee: number;
  weekendPrice: number | null;
  minNights: number;
  status: string;
  isActive: boolean;
  wifiSsid: string | null;
  wifiPassword: string | null;
}

export type UnitBody = Partial<Omit<ManagedUnit, 'id' | 'status'>>;

export type DocumentType = 'TITLE_DEED' | 'LEASE' | 'TOURISM_LICENSE' | 'OPERATOR_AUTHORIZATION' | 'OTHER';

export interface PropertyDocument {
  id: Uuid;
  type: DocumentType;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: ApiInstant;
}

export interface ManagedPhoto extends Photo {
  sortOrder: number;
  isCover: boolean;
  unitId: Uuid | null;
  source: 'OWNER' | 'PHOTOGRAPHER' | string;
}

export interface Person {
  id: Uuid;
  fullName: string;
  mobile: string;
}

/** Unit summary inside a {@link PropertyRow}. */
export interface PropertyRowUnit {
  id: Uuid;
  name: string;
  status: string;
  isActive: boolean;
}

/** Summary row of a property list (`GET /host/properties`, `GET /admin/properties`). */
export interface PropertyRow {
  id: Uuid;
  nameAr: string;
  nameEn: string | null;
  status: PropertyStatus;
  type: Bilingual & { id: Uuid; code: string };
  city: (Bilingual & { id: Uuid; code: string }) | null;
  district: (Bilingual & { id: Uuid }) | null;
  operatingModel: OperatingModel | null;
  coverUrl: string | null;
  unitsCount: number;
  units: PropertyRowUnit[];
  fromPrice: number | null;
  owner: { id: Uuid; fullName: string };
  submittedAt: ApiInstant | null;
  updatedAt: ApiInstant;
}

/** Property in the host portal / admin review (grouped like the onboarding wizard). */
export interface ManagedProperty {
  id: Uuid;
  status: PropertyStatus;
  owner: Person;
  identity: {
    type: PropertyType;
    nameAr: string;
    nameEn: string | null;
    city: CityRef | null;
    district: District | null;
    addressLine: string | null;
    latitude: number | null;
    longitude: number | null;
    tourismLicenseNo: string | null;
  };
  content: {
    descriptionAr: string | null;
    descriptionEn: string | null;
    guideAr: string | null;
    amenities: Amenity[];
    photos: ManagedPhoto[];
  };
  commercial: {
    cancellationPolicy: (Bilingual & { id: Uuid; code: string; rules: CancellationRule[] }) | null;
    houseRulesAr: string | null;
    damagePolicyAr: string | null;
    checkInTime: ApiTime | null;
    checkOutTime: ApiTime | null;
    units: ManagedUnit[];
  };
  operations: { operatingModel: OperatingModel | null; operators: Person[] };
  governance: {
    status: PropertyStatus;
    submittedAt: ApiInstant | null;
    reviewedAt: ApiInstant | null;
    rejectionReason: string | null;
    publishedAt: ApiInstant | null;
    documents: PropertyDocument[];
  };
  createdAt: ApiInstant;
  updatedAt: ApiInstant;
  /** Admin review view only. */
  checklist?: PropertyChecklist;
}

export interface PropertyBody {
  typeId?: Uuid;
  nameAr?: string;
  nameEn?: string | null;
  cityId?: Uuid | null;
  districtId?: Uuid | null;
  addressLine?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  tourismLicenseNo?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  guideAr?: string | null;
  cancellationPolicyId?: Uuid | null;
  houseRulesAr?: string | null;
  damagePolicyAr?: string | null;
  checkInTime?: ApiTime | null;
  checkOutTime?: ApiTime | null;
  operatingModel?: OperatingModel | null;
  /** Admins creating on behalf of an owner. */
  ownerId?: Uuid;
}

export interface PropertyChecklist {
  complete: boolean;
  items: { key: string; ok: boolean; message: string; labelAr?: string; labelEn?: string; /** Photos item: uploaded / needed. */ current?: number; required?: number }[];
}

export interface HostPropertiesQuery extends PageQuery {
  status?: PropertyStatus;
  search?: string;
}

// ---------- calendar, rates, blocks, discounts ----------

export type CalendarDayStatus = 'available' | 'booked' | 'blocked' | 'held' | string;
export type BlockReason = 'MAINTENANCE' | 'OWNER_USE' | 'OTHER';

export interface CalendarDay {
  date: ApiDate;
  /** 0 = Sunday. */
  weekday: number;
  status: CalendarDayStatus;
  /** The block on blocked days (use with `DELETE /host/blocks/:id`). */
  occupancyId: Uuid | null;
  /** The booking on booked days. */
  bookingId: Uuid | null;
  blockReason: BlockReason | null;
  basePrice: number;
  discountPercent: number;
  price: number;
  isOverride: boolean;
  minNights: number;
}

export interface UnitCalendar {
  unitId: Uuid;
  basePrice: number;
  weekendPrice: number | null;
  minNights: number;
  days: CalendarDay[];
}

export interface Block {
  id: Uuid;
  startDate: ApiDate;
  endDate: ApiDate;
  reason: BlockReason;
  note: string | null;
}

export interface Discount {
  id: Uuid;
  percent: number;
  startDate: ApiDate;
  endDate: ApiDate;
  label: string | null;
}

export interface RatesBody {
  startDate: ApiDate;
  endDate: ApiDate;
  /** 0 = Sunday; omit for every day. */
  weekdays?: number[];
  price?: number | null;
  minNights?: number | null;
}

// ---------- locks & access ----------

export type LockProvider = 'TTLOCK' | 'IGLOOHOME' | 'NUKI' | 'MANUAL' | 'SIMULATOR';

export interface Lock {
  id: Uuid;
  unitId: Uuid;
  unit: { id: Uuid; name: string };
  property: { id: Uuid; nameAr: string };
  provider: LockProvider;
  externalId: string;
  model: string | null;
  supportsRemoteUnlock: boolean;
  supportsOfflineCodes: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  batteryLevel: number | null;
  lastSyncAt: ApiInstant | null;
  alerts: string[];
}

export interface PairLockBody {
  provider: LockProvider;
  externalId: string;
  model?: string | null;
  supportsRemoteUnlock?: boolean;
  supportsOfflineCodes?: boolean;
  /** MANUAL locks only. */
  staticCode?: string;
}

export interface AccessLog {
  id: Uuid;
  unitId: Uuid;
  bookingId: Uuid | null;
  method: string;
  success: boolean;
  reason: string | null;
  source: string;
  occurredAt: ApiInstant;
}

export interface GuestKey {
  bookingId: Uuid;
  hasLock: boolean;
  key: {
    id: Uuid;
    status: string;
    mode: 'ONLINE' | 'OFFLINE';
    validFrom: ApiInstant;
    validTo: ApiInstant;
    attempts: number;
    lastError: string | null;
    revokedAt: ApiInstant | null;
  } | null;
}

// ---------- smart pricing ----------

export type RecommendationStatus = 'PENDING' | 'APPLIED' | 'REJECTED' | 'EXPIRED';

export interface PricingReason {
  code: string;
  labelAr: string;
  labelEn: string;
  impactPercent: number;
}

export interface PriceRecommendation {
  id: Uuid;
  unit: { id: Uuid; name: string };
  propertyId: Uuid;
  date: ApiDate;
  currentPrice: number;
  recommendedPrice: number;
  direction: 'UP' | 'DOWN' | 'SAME';
  changePercent: number;
  reasons: PricingReason[];
  status: RecommendationStatus;
  appliedPrice: number | null;
  autoApplied: boolean;
  decidedAt: ApiInstant | null;
  generatedAt: ApiInstant;
}

export interface RecommendationsMeta extends PageMeta {
  summary: { up: number; down: number };
}

export interface RecommendationDecision {
  id: Uuid;
  action: 'APPROVE' | 'REJECT' | 'EDIT';
  /** Required for EDIT. */
  price?: number;
}

export interface DecideResult {
  applied: number;
  rejected: number;
  skipped: { id: Uuid; reason?: string; code?: string }[];
}

export interface PricingSettings {
  propertyId: Uuid;
  autoApply: boolean;
  units: { id: Uuid; name: string; basePrice: number; weekendPrice: number | null; minPrice: number | null; maxPrice: number | null }[];
}

export interface PricingSettingsBody {
  autoApply?: boolean;
  units?: { unitId: Uuid; minPrice?: number | null; maxPrice?: number | null }[];
}

// ---------- KPIs (host & admin share the shape) ----------

export interface KpiValues {
  bookings: number;
  nightsSold: number;
  nightsAvailable: number;
  occupancyRate: number | null;
  revenue: number;
  adr: number | null;
  revpar: number | null;
  cancellationRate: number | null;
  cancelledBookings: number;
  averageRating: number | null;
  reviews: number;
  activeGuests: number;
  repeatGuestRate: number | null;
}

export interface KpiDashboard {
  period: { from: ApiDate; to: ApiDate; days: number };
  previousPeriod: { from: ApiDate; to: ApiDate };
  filters: Record<string, string | null>;
  summary: KpiValues;
  previous: KpiValues;
  changePercent: Record<keyof KpiValues, number | null>;
  operations: {
    tasksDue: number;
    tasksDone: number;
    tasksOverdue: number;
    onTimeRate: number | null;
    completedStays: number;
    incidents: number;
    incidentsPer100Stays: number | null;
    damageCases: number;
    damageCasesPer100Stays: number | null;
  };
  trend: { granularity: 'day' | 'week' | 'month'; points: (KpiValues & { period: string })[] };
}

export interface KpiPropertyRow extends KpiValues {
  property: Bilingual & { id: Uuid; operatingModel: OperatingModel | null; city: { nameAr: string } | null };
}

export interface KpiQuery {
  from?: ApiDate;
  to?: ApiDate;
  propertyId?: Uuid;
  propertyTypeId?: Uuid;
  cityId?: Uuid;
  operatingModel?: OperatingModel;
}

// ---------- finance ----------

export type EarningType = 'BOOKING' | 'STAY_REQUEST' | 'DAMAGE' | 'ADJUSTMENT';

export interface Earning {
  id: Uuid;
  type: EarningType;
  earnedOn: ApiDate;
  descriptionAr: string;
  descriptionEn: string;
  property?: { id: Uuid; nameAr: string };
  bookingNumber?: string | null;
  gross: number;
  vat: number;
  commissionBase: number;
  commissionPercent: number;
  commission: number;
  platformFunded: number;
  paymentFees: number;
  net: number;
  statementId: Uuid | null;
  createdAt: ApiInstant;
}

export interface EarningsMeta extends PageMeta {
  pendingNet: number;
}

export interface EarningsQuery extends PageQuery {
  propertyId?: Uuid;
  type?: EarningType;
  from?: ApiDate;
  to?: ApiDate;
  unsettled?: boolean;
}

export interface Statement {
  id: Uuid;
  number: string;
  owner?: Person;
  /** `YYYY-MM`. */
  period: string;
  periodStart: ApiDate;
  periodEnd: ApiDate;
  linesCount: number;
  gross: number;
  vat: number;
  commission: number;
  paymentFees: number;
  net: number;
  status: 'ISSUED' | 'PAID';
  issuedAt: ApiInstant;
  paidAt: ApiInstant | null;
  bankReference: string | null;
  ibanLast4: string | null;
  lines?: Earning[];
}

export type BankAccountStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface BankAccount {
  ownerId: Uuid;
  accountName: string;
  bankName: string;
  /** Masked except in the admin verification view. */
  iban: string;
  ibanLast4: string;
  status: BankAccountStatus;
  verifiedAt: ApiInstant | null;
  rejectionReason: string | null;
  updatedAt: ApiInstant;
  owner?: Person;
}

// ---------- host lists ----------

export interface HostBookingsQuery extends PageQuery {
  status?: BookingStatus;
  propertyId?: Uuid;
  unitId?: Uuid;
  from?: ApiDate;
  to?: ApiDate;
  search?: string;
}

export interface HostTasksQuery extends PageQuery {
  status?: TaskStatus[];
  type?: TaskType[];
  propertyId?: Uuid;
  unitId?: Uuid;
  assigneeId?: Uuid;
  /** `true`: only tasks nobody is assigned to (photo shoots awaiting a photographer). */
  unassigned?: boolean;
  from?: ApiInstant;
  to?: ApiInstant;
}

export interface CreateTaskBody {
  type: TaskType;
  propertyId: Uuid;
  unitId?: Uuid;
  bookingId?: Uuid;
  incidentId?: Uuid;
  assigneeId?: Uuid;
  title: string;
  notes?: string | null;
  dueAt: ApiInstant;
}

export interface UpdateTaskBody {
  assigneeId?: Uuid | null;
  dueAt?: ApiInstant;
  title?: string;
  notes?: string | null;
}
