import { ApiTime, Bilingual, Uuid } from '../api.types';
import { LoyaltyTier } from './user.dto';

export interface District extends Bilingual {
  id: Uuid;
}

export interface City extends Bilingual {
  id: Uuid;
  slug: string;
  sortOrder: number;
  districts: District[];
}

export interface PropertyType extends Bilingual {
  id: Uuid;
  code: string;
}

export interface Amenity extends Bilingual {
  id: Uuid;
  code: string;
  icon: string | null;
}

export interface CancellationRule {
  minHoursBefore: number;
  refundPercent: number;
}

export interface CancellationPolicy extends Bilingual {
  id: Uuid;
  code: string;
  descriptionAr: string;
  descriptionEn: string | null;
  rules: CancellationRule[];
}

export type NafathRequiredFor = 'NONE' | 'BOOKING' | 'KEY';

export interface PublicSettings {
  vat_percent: number;
  check_in_time: ApiTime;
  check_out_time: ApiTime;
  /** JS weekday numbers (0 = Sunday) priced as weekend nights. */
  weekend_nights: number[];
  booking_window_days: number;
  max_stay_nights: number;
  min_property_photos: number;
  max_compare_units: number;
  wallet_topup: { presets: number[]; min: number; max: number };
  support_whatsapp: string;
  loyalty: {
    pointsPer100Sar: number;
    redeemBlockPoints: number;
    redeemBlockValueSar: number;
    welcomePoints: number;
    reviewPoints: number;
    referralBonusSar: number;
    freeCleaningEvery: number;
    tiers: LoyaltyTier[];
  };
  stay_changes: { earlyCheckInFee: number; lateCheckOutFee: number; earliestCheckIn: ApiTime; latestCheckOut: ApiTime };
  damage: { objectionDays: number; maxClaimSar: number };
  compliance: {
    nafathRequiredFor: NafathRequiredFor;
    shomoosEnabled: boolean;
    shomoosTrigger: string;
    shomoosBlocksKey: boolean;
    ewaaEnabled: boolean;
  };
}

export interface Catalog {
  cities: City[];
  propertyTypes: PropertyType[];
  amenities: Amenity[];
  cancellationPolicies: CancellationPolicy[];
  settings: PublicSettings;
}
