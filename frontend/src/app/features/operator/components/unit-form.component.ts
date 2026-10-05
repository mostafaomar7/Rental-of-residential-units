import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ManagedUnit, UnitBody } from '@api/dto';
import { FieldComponent } from '@shared/ui/field/field.component';

/** Editable unit fields; numbers stay text while typing (empty optional fields become `null`). */
export interface UnitForm {
  name: string;
  maxGuests: string;
  bedrooms: string;
  beds: string;
  bathrooms: string;
  areaSqm: string;
  basePrice: string;
  weekendPrice: string;
  cleaningFee: string;
  minNights: string;
  wifiSsid: string;
  wifiPassword: string;
}

type NumberField = Exclude<keyof UnitForm, 'name' | 'wifiSsid' | 'wifiPassword'>;

interface NumberInput {
  key: NumberField;
  min: number;
  optional?: boolean;
}

const CAPACITY: readonly NumberInput[] = [
  { key: 'maxGuests', min: 1 },
  { key: 'bedrooms', min: 0 },
  { key: 'beds', min: 1 },
  { key: 'bathrooms', min: 0 },
  { key: 'areaSqm', min: 1, optional: true },
];

const PRICING: readonly NumberInput[] = [
  { key: 'basePrice', min: 1 },
  { key: 'weekendPrice', min: 1, optional: true },
  { key: 'cleaningFee', min: 0 },
  { key: 'minNights', min: 1 },
];

export function emptyUnitForm(): UnitForm {
  return {
    name: '',
    maxGuests: '2',
    bedrooms: '1',
    beds: '1',
    bathrooms: '1',
    areaSqm: '',
    basePrice: '',
    weekendPrice: '',
    cleaningFee: '0',
    minNights: '1',
    wifiSsid: '',
    wifiPassword: '',
  };
}

export function unitToForm(u: ManagedUnit): UnitForm {
  const text = (n: number | null): string => (n === null ? '' : String(n));
  return {
    name: u.name,
    maxGuests: text(u.maxGuests),
    bedrooms: text(u.bedrooms),
    beds: text(u.beds),
    bathrooms: text(u.bathrooms),
    areaSqm: text(u.areaSqm),
    basePrice: text(u.basePrice),
    weekendPrice: text(u.weekendPrice),
    cleaningFee: text(u.cleaningFee),
    minNights: text(u.minNights),
    wifiSsid: u.wifiSsid ?? '',
    wifiPassword: u.wifiPassword ?? '',
  };
}

/** Name, guests and base price are required; numbers must be valid. */
export function isUnitFormValid(f: UnitForm): boolean {
  const required: NumberField[] = ['maxGuests', 'bedrooms', 'beds', 'bathrooms', 'basePrice', 'cleaningFee', 'minNights'];
  const optional: NumberField[] = ['areaSqm', 'weekendPrice'];
  return (
    !!f.name.trim() &&
    required.every((k) => f[k].trim() !== '' && Number.isFinite(Number(f[k]))) &&
    optional.every((k) => f[k].trim() === '' || Number.isFinite(Number(f[k]))) &&
    Number(f.basePrice) > 0
  );
}

/** Request body of a valid form. */
export function unitFormBody(f: UnitForm): UnitBody & { name: string; maxGuests: number; basePrice: number } {
  const optional = (v: string): number | null => (v.trim() === '' ? null : Number(v));
  return {
    name: f.name.trim(),
    maxGuests: Number(f.maxGuests),
    bedrooms: Number(f.bedrooms),
    beds: Number(f.beds),
    bathrooms: Number(f.bathrooms),
    areaSqm: optional(f.areaSqm),
    basePrice: Number(f.basePrice),
    weekendPrice: optional(f.weekendPrice),
    cleaningFee: Number(f.cleaningFee),
    minNights: Number(f.minNights),
    wifiSsid: f.wifiSsid.trim() || null,
    wifiPassword: f.wifiPassword.trim() || null,
  };
}

/** Unit fields (capacity, prices, Wi-Fi): `<app-unit-form [(value)]="form" />`. */
@Component({
  selector: 'app-unit-form',
  imports: [TranslatePipe, FieldComponent],
  template: `
    @let f = value();
    <app-field [label]="'operator.unit.name' | translate" [for]="idPrefix() + '-name'">
      <input class="input" #name [id]="idPrefix() + '-name'" [value]="f.name" [placeholder]="'operator.unit.namePlaceholder' | translate" (input)="set('name', name.value)" />
    </app-field>

    <div class="xs muted b mt-12 mb-8">{{ 'operator.unit.capacity' | translate }}</div>
    <div class="grid g3">
      @for (n of capacity; track n.key) {
        <app-field [label]="'operator.unit.' + n.key | translate" [for]="idPrefix() + '-' + n.key">
          <input class="input" type="number" #num [id]="idPrefix() + '-' + n.key" [min]="n.min" [value]="f[n.key]" [placeholder]="n.optional ? ('operator.unit.optional' | translate) : ''" (input)="set(n.key, num.value)" />
        </app-field>
      }
    </div>

    <div class="xs muted b mt-12 mb-8">{{ 'operator.unit.pricing' | translate }}</div>
    <div class="grid g2">
      @for (n of pricing; track n.key) {
        <app-field [label]="'operator.unit.' + n.key | translate" [for]="idPrefix() + '-' + n.key">
          <input class="input" type="number" #num [id]="idPrefix() + '-' + n.key" [min]="n.min" [value]="f[n.key]" [placeholder]="n.optional ? ('operator.unit.optional' | translate) : ''" (input)="set(n.key, num.value)" />
        </app-field>
      }
    </div>

    @if (withWifi()) {
      <div class="xs muted b mt-12 mb-8">{{ 'operator.unit.wifi' | translate }}</div>
      <div class="grid g2">
        <app-field [label]="'operator.unit.wifiSsid' | translate" [for]="idPrefix() + '-ssid'">
          <input class="input ltr" #ssid [id]="idPrefix() + '-ssid'" [value]="f.wifiSsid" (input)="set('wifiSsid', ssid.value)" />
        </app-field>
        <app-field [label]="'operator.unit.wifiPassword' | translate" [for]="idPrefix() + '-wifi-pass'">
          <input class="input ltr" #pass [id]="idPrefix() + '-wifi-pass'" [value]="f.wifiPassword" (input)="set('wifiPassword', pass.value)" />
        </app-field>
      </div>
    }
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitFormComponent {
  readonly value = model.required<UnitForm>();
  readonly idPrefix = input('unit');
  readonly withWifi = input(true);

  protected readonly capacity = CAPACITY;
  protected readonly pricing = PRICING;

  protected set(key: keyof UnitForm, text: string): void {
    this.value.update((f) => ({ ...f, [key]: text }));
  }
}
