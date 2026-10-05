import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { ApiError } from '@api/api-error';
import { Lock, ManagedPhoto, ManagedProperty, ManagedUnit, OperatingModel, PropertyBody } from '@api/dto';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { CatalogService } from '@core/services/catalog.service';
import { ToastService } from '@core/services/toast.service';
import { UnitForm, emptyUnitForm, isUnitFormValid, unitFormBody } from '../../components/unit-form.component';
import { Mutation } from '../../services/mutation';
import { OperatorPortfolioService } from '../../services/operator-portfolio.service';

/** Wizard steps, in order (labels: `operator.add.steps.<id>`). */
export const WIZARD_STEPS = ['type', 'location', 'units', 'amenities', 'photos', 'policies', 'supervision', 'lock', 'review'] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

/** Default check-in / check-out when the platform settings are not loaded. */
const FALLBACK_CHECK_IN = '15:00';
const FALLBACK_CHECK_OUT = '12:00';
/** The API requires this many characters of Arabic description before publishing. */
export const MIN_DESCRIPTION_LENGTH = 50;

export interface WizardForm {
  typeId: string;
  nameAr: string;
  nameEn: string;
  cityId: string;
  districtId: string;
  addressLine: string;
  /** Map pin, as typed (validated on the location step). */
  latitude: string;
  longitude: string;
  descriptionAr: string;
  descriptionEn: string;
  tourismLicenseNo: string;
  unit: UnitForm;
  amenityIds: string[];
  cancellationPolicyId: string;
  checkInTime: string;
  checkOutTime: string;
  houseRulesAr: string;
  damagePolicyAr: string;
  operatingModel: OperatingModel;
}

function emptyForm(): WizardForm {
  return {
    typeId: '',
    nameAr: '',
    nameEn: '',
    cityId: '',
    districtId: '',
    addressLine: '',
    latitude: '',
    longitude: '',
    descriptionAr: '',
    descriptionEn: '',
    tourismLicenseNo: '',
    unit: emptyUnitForm(),
    amenityIds: [],
    cancellationPolicyId: '',
    checkInTime: '',
    checkOutTime: '',
    houseRulesAr: '',
    damagePolicyAr: '',
    operatingModel: 'SUPERVISED',
  };
}

/** The typed coordinates, when both are valid. */
export function mapPin(f: Pick<WizardForm, 'latitude' | 'longitude'>): { latitude: number; longitude: number } | null {
  const latitude = Number(f.latitude);
  const longitude = Number(f.longitude);
  const valid = f.latitude.trim() !== '' && f.longitude.trim() !== '' && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  return valid ? { latitude, longitude } : null;
}

/**
 * State of the onboarding wizard (SRS PRP-01). The draft property is created on the location
 * step; every later step saves its part before moving on, and the last one submits it for review.
 * Provided by the wizard page, so each visit starts a new draft (unfinished drafts stay in the
 * properties list).
 */
@Injectable()
export class AddPropertyWizardService {
  private readonly api = inject(HostPropertiesApi);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);
  private readonly portfolio = inject(OperatorPortfolioService);

  readonly form = signal<WizardForm>(emptyForm());
  /** 1-based step number. */
  readonly step = signal(1);
  readonly current = computed<WizardStep>(() => WIZARD_STEPS[this.step() - 1]);
  /** The draft once created (latest version returned by the API). */
  readonly property = signal<ManagedProperty | null>(null);
  readonly unit = signal<ManagedUnit | null>(null);
  readonly photos = signal<ManagedPhoto[]>([]);
  readonly lock = signal<Lock | null>(null);
  readonly submitted = signal(false);
  /** A Rawaaf photographer was booked on the photos step. */
  readonly shootRequested = signal(false);
  /** Finished without submitting: only the shoot's photos are missing, so it stays a draft until then. */
  readonly awaitingShoot = signal(false);
  readonly finished = computed(() => this.submitted() || this.awaitingShoot());
  /** Owner's declaration on the review step (required to submit). */
  readonly acknowledged = signal(false);
  readonly saving = new Mutation();

  readonly checkInTime = computed(() => this.form().checkInTime || this.catalog.settings()?.check_in_time || FALLBACK_CHECK_IN);
  readonly checkOutTime = computed(() => this.form().checkOutTime || this.catalog.settings()?.check_out_time || FALLBACK_CHECK_OUT);

  patch(changes: Partial<WizardForm>): void {
    this.form.update((f) => ({ ...f, ...changes }));
  }

  toggleAmenity(id: string): void {
    const ids = this.form().amenityIds;
    this.patch({ amenityIds: ids.includes(id) ? ids.filter((a) => a !== id) : [...ids, id] });
  }

  back(): void {
    this.step.update((s) => Math.max(1, s - 1));
  }

  /** Validates and saves the current step, then advances (the review step submits instead). */
  next(): void {
    const error = this.validate();
    if (error) {
      this.toast.error(error);
      return;
    }
    if (this.current() === 'review') {
      this.submit();
      return;
    }
    this.saving.run(this.saveStep(), () => {
      this.step.update((s) => Math.min(WIZARD_STEPS.length, s + 1));
      window.scrollTo(0, 0);
    });
  }

  private validate(): string | null {
    const f = this.form();
    switch (this.current()) {
      case 'type':
        return f.typeId ? null : 'operator.add.errors.type';
      case 'location':
        if (!f.nameAr.trim() || !f.cityId) return 'operator.add.errors.nameCity';
        if (!f.districtId || !f.addressLine.trim()) return 'operator.add.errors.address';
        if (!mapPin(f)) return 'operator.add.errors.pin';
        return f.descriptionAr.trim().length >= MIN_DESCRIPTION_LENGTH ? null : 'operator.add.errors.description';
      case 'units':
        return isUnitFormValid(f.unit) ? null : 'operator.add.errors.unit';
      case 'review':
        return this.acknowledged() ? null : 'operator.add.errors.ack';
      default:
        return null;
    }
  }

  /** The request that persists the current step (or nothing to save). */
  private saveStep(): Observable<unknown> {
    const f = this.form();
    const draft = this.property();
    switch (this.current()) {
      case 'location':
        return this.saveProperty(this.identityBody(f));
      case 'units': {
        if (!draft) return of(null);
        const body = unitFormBody(f.unit);
        const unit = this.unit();
        const request = unit ? this.api.updateUnit(unit.id, body) : this.api.addUnit(draft.id, body);
        return request.pipe(tap((u) => this.unit.set(u)));
      }
      case 'amenities':
        return draft ? this.api.setAmenities(draft.id, f.amenityIds).pipe(tap((p) => this.property.set(p))) : of(null);
      case 'policies':
        return this.saveProperty({
          cancellationPolicyId: f.cancellationPolicyId || null,
          checkInTime: this.checkInTime(),
          checkOutTime: this.checkOutTime(),
          houseRulesAr: f.houseRulesAr.trim() || null,
          damagePolicyAr: f.damagePolicyAr.trim() || null,
        });
      case 'supervision':
        return this.saveProperty({ operatingModel: f.operatingModel });
      default:
        return of(null);
    }
  }

  private identityBody(f: WizardForm): PropertyBody & { typeId: string; nameAr: string } {
    return {
      typeId: f.typeId,
      nameAr: f.nameAr.trim(),
      nameEn: f.nameEn.trim() || null,
      cityId: f.cityId || null,
      districtId: f.districtId || null,
      addressLine: f.addressLine.trim() || null,
      latitude: mapPin(f)?.latitude ?? null,
      longitude: mapPin(f)?.longitude ?? null,
      descriptionAr: f.descriptionAr.trim() || null,
      descriptionEn: f.descriptionEn.trim() || null,
      tourismLicenseNo: f.tourismLicenseNo.trim() || null,
    };
  }

  /** Creates the draft on first save, then patches it. */
  private saveProperty(body: PropertyBody): Observable<ManagedProperty> {
    const draft = this.property();
    const request = draft ? this.api.update(draft.id, body) : this.api.create(this.identityBody(this.form()));
    return request.pipe(
      tap((p) => {
        if (!draft) this.portfolio.reload();
        this.property.set(p);
      }),
    );
  }

  private submit(): void {
    const draft = this.property();
    if (!draft) return;
    this.saving.run(
      this.api.submit(draft.id),
      (p) => {
        this.property.set(p);
        this.submitted.set(true);
        this.portfolio.reload();
        this.toast.success('operator.add.submitted');
      },
      (err) => {
        if (!this.onlyPhotosMissing(err)) {
          this.toast.apiError(err);
          return;
        }
        this.awaitingShoot.set(true);
        this.portfolio.reload();
      },
    );
  }

  /** The submission failed only on the photo count while a shoot is booked to take them. */
  private onlyPhotosMissing(err: unknown): boolean {
    const error = ApiError.from(err);
    if (!this.shootRequested() || !error.is('PROPERTY_INCOMPLETE') || !Array.isArray(error.details)) return false;
    const missing = (error.details as { key?: string; ok?: boolean }[]).filter((item) => !item.ok);
    return missing.length > 0 && missing.every((item) => item.key === 'photos');
  }
}
