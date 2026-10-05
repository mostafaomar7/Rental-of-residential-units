import { ApiDate, ApiInstant, ApiTime, Bilingual, PageQuery, Uuid } from '../api.types';
import { CancellationRule } from './catalog.dto';

export type OperatingModel = 'SUPERVISED' | 'SELF_SERVICE';
export type PropertyStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'SUSPENDED';

/** Short code + bilingual name, as embedded in listings. */
export interface CodedRef extends Bilingual {
  code: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Photo {
  id: Uuid;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  caption?: string | null;
}

export interface NightlyPrice {
  currency: 'SAR';
  nightly: number;
  originalNightly: number;
  discountPercent: number;
}

/** Search / home / favourites card. */
export interface PropertyCard extends Bilingual {
  id: Uuid;
  type: CodedRef;
  city: CodedRef | null;
  district: (Bilingual & { id: Uuid }) | null;
  coverUrl: string | null;
  /** Thumbnail URLs. */
  photos: string[];
  rating: number;
  reviewsCount: number;
  operatingModel: OperatingModel | null;
  location: GeoPoint | null;
  unitsCount: number;
  /** Cheapest unit that fits the search. */
  unit: { id: Uuid; name: string; maxGuests: number; bedrooms: number; beds: number; bathrooms: number };
  price: NightlyPrice;
  /** Real stay price when the search has dates. */
  stay: { nights: number; total: number; [key: string]: unknown } | null;
  publishedAt: ApiInstant | null;
  isFavorite?: boolean;
  featured?: boolean;
}

export type PropertySort = 'recommended' | 'price_asc' | 'price_desc' | 'rating' | 'newest';

export interface PropertySearchQuery extends PageQuery {
  q?: string;
  /** City slug. */
  city?: string;
  districtId?: Uuid;
  /** Property type codes. */
  types?: string[];
  /** Amenity codes. */
  amenities?: string[];
  operatingModel?: OperatingModel;
  checkIn?: ApiDate;
  checkOut?: ApiDate;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: PropertySort;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

export interface UnitDiscount {
  id?: Uuid;
  percent: number;
  startDate: ApiDate;
  endDate: ApiDate;
  label: string | null;
}

export interface PublicUnit {
  id: Uuid;
  name: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  areaSqm: number | null;
  basePrice: number;
  weekendPrice: number | null;
  cleaningFee: number;
  minNights: number;
  discounts: UnitDiscount[];
}

export interface PolicyCancellation extends CodedRef {
  descriptionAr: string;
  descriptionEn: string | null;
  rules: CancellationRule[];
}

export interface PropertyPolicies {
  /** Send back as `policyVersion` when booking. */
  version: string;
  cancellation: PolicyCancellation | null;
  houseRulesAr: string | null;
  damagePolicyAr: string | null;
  checkInTime: ApiTime;
  checkOutTime: ApiTime;
}

/** Public property page. */
export interface PropertyDetail extends Bilingual {
  id: Uuid;
  type: CodedRef;
  city: CodedRef | null;
  district: (Bilingual & { id: Uuid }) | null;
  location: GeoPoint | null;
  tourismLicenseNo: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  operatingModel: OperatingModel | null;
  amenities: (CodedRef & { icon: string | null })[];
  photos: Photo[];
  policies: PropertyPolicies;
  units: PublicUnit[];
  host: { firstName: string; memberSince: number };
  rating: { average: number; count: number };
  publishedAt: ApiInstant | null;
  isFavorite?: boolean;
}

export interface AvailabilityDay {
  date: ApiDate;
  available: boolean;
  price: number;
  basePrice: number;
  minNights: number;
}

export interface QuoteNight {
  date: ApiDate;
  basePrice: number;
  discountPercent: number;
  price: number;
}

export interface QuotePricing {
  currency: 'SAR';
  originalAccommodation: number;
  discount: number;
  accommodation: number;
  cleaningFee: number;
  cleaningWaived: boolean;
  subtotal: number;
  vatPercent: number;
  vat: number;
  total: number;
  promo?: { code: string; discount: number };
}

/** Reason a stay cannot be booked; the backend sends a code (plus optional context). */
export type QuoteIssue = string | { code: string; message?: string; [key: string]: unknown };

export interface Quote {
  available: boolean;
  /** Why the stay cannot be booked — show them. */
  issues: QuoteIssue[];
  checkIn: ApiDate;
  checkOut: ApiDate;
  nightsCount: number;
  guests: number;
  minNights: number;
  nights: QuoteNight[];
  pricing: QuotePricing;
  /** Signed-in guests only. */
  rewards?: { points: number; cashback: number; cashbackPercent: number; tier: string };
}

export interface QuoteQuery {
  checkIn: ApiDate;
  checkOut: ApiDate;
  guests?: number;
  useFreeCleaning?: boolean;
}

// ---------- reviews ----------

export interface ReviewPhoto {
  id: Uuid;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
}

export interface Review {
  id: Uuid;
  rating: number;
  comment: string | null;
  guest: { firstName: string };
  /** `YYYY-MM`. */
  stayedIn: string;
  unit: { id: Uuid; name: string };
  photos: ReviewPhoto[];
  reply: { text: string; repliedAt: ApiInstant } | null;
  createdAt: ApiInstant;
  updatedAt: ApiInstant;
}

/** Review as seen by its author, the host or an admin. */
export interface ManagedReview extends Review {
  bookingId: Uuid;
  bookingNumber: string;
  property: Bilingual & { id: Uuid };
  status: 'PUBLISHED' | 'HIDDEN';
  hidden: { reason: string; at: ApiInstant } | null;
}

export interface ReviewSummary {
  average: number;
  count: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface PropertyReviews {
  summary: ReviewSummary;
  items: Review[];
}

export type ReviewSort = 'newest' | 'highest' | 'lowest';

export interface PropertyReviewsQuery extends PageQuery {
  sort?: ReviewSort;
  withPhotos?: boolean;
  unitId?: Uuid;
}

export interface PendingReview {
  bookingId: Uuid;
  bookingNumber: string;
  property: Bilingual & { id: Uuid };
  unit: { id: Uuid; name: string };
  checkIn: ApiDate;
  checkOut: ApiDate;
  rewardPoints: number;
}

// ---------- compare ----------

export interface CompareProperty {
  id: Uuid;
  nameAr: string;
  nameEn?: string | null;
  coverUrl: string | null;
  type: CodedRef;
  city: CodedRef | null;
  rating: number;
  reviewsCount: number;
  price: NightlyPrice;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  operatingModel: OperatingModel | null;
  cancellationPolicy: (CodedRef & { rules?: CancellationRule[] }) | null;
  checkInTime: ApiTime;
  checkOutTime: ApiTime;
  amenityCodes: string[];
}

export interface CompareResult {
  amenities: (CodedRef & { icon: string | null })[];
  properties: CompareProperty[];
}
