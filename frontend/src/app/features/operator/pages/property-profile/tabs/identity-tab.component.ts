import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ManagedProperty, PropertyBody } from '@api/dto';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { CatalogService } from '@core/services/catalog.service';
import { ToastService } from '@core/services/toast.service';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { FieldComponent } from '@shared/ui/field/field.component';
import { Mutation } from '../../../services/mutation';
import { SaveBarComponent } from './save-bar.component';

interface IdentityForm {
  nameAr: string;
  nameEn: string;
  typeId: string;
  cityId: string;
  districtId: string;
  addressLine: string;
  latitude: string;
  longitude: string;
  tourismLicenseNo: string;
}

function toForm(p: ManagedProperty): IdentityForm {
  const i = p.identity;
  return {
    nameAr: i.nameAr,
    nameEn: i.nameEn ?? '',
    typeId: i.type.id,
    cityId: i.city?.id ?? '',
    districtId: i.district?.id ?? '',
    addressLine: i.addressLine ?? '',
    latitude: i.latitude?.toString() ?? '',
    longitude: i.longitude?.toString() ?? '',
    tourismLicenseNo: i.tourismLicenseNo ?? '',
  };
}

/** Empty text → `null`; otherwise the number (coordinates). */
function toNumber(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}

/** Identity layer: names, type, location, owner and tourism licence. */
@Component({
  selector: 'app-identity-tab',
  imports: [TranslatePipe, LocalizePipe, FieldComponent, SaveBarComponent],
  template: `
    @let f = form();
    <h3 class="h3 mb-16">{{ 'operator.profile.identity.title' | translate }}</h3>
    <div class="grid g2">
      <app-field [label]="'operator.profile.identity.nameAr' | translate" for="pi-name-ar">
        <input id="pi-name-ar" class="input" dir="rtl" #nameAr [value]="f.nameAr" (input)="set('nameAr', nameAr.value)" />
      </app-field>
      <app-field [label]="'operator.profile.identity.nameEn' | translate" for="pi-name-en">
        <input id="pi-name-en" class="input" dir="ltr" #nameEn [value]="f.nameEn" (input)="set('nameEn', nameEn.value)" />
      </app-field>
      <app-field [label]="'operator.profile.identity.type' | translate" for="pi-type">
        <select id="pi-type" class="select" #type (change)="set('typeId', type.value)">
          @for (t of catalog.propertyTypes(); track t.id) {
            <option [value]="t.id" [selected]="t.id === f.typeId">{{ t | loc }}</option>
          }
        </select>
      </app-field>
      <app-field [label]="'operator.profile.identity.owner' | translate" for="pi-owner" [help]="'operator.profile.identity.ownerHelp' | translate">
        <input id="pi-owner" class="input" [value]="property().owner.fullName" disabled />
      </app-field>
      <app-field [label]="'operator.profile.identity.city' | translate" for="pi-city">
        <select id="pi-city" class="select" #city (change)="setCity(city.value)">
          <option value="" [selected]="!f.cityId">—</option>
          @for (c of catalog.cities(); track c.id) {
            <option [value]="c.id" [selected]="c.id === f.cityId">{{ c | loc }}</option>
          }
        </select>
      </app-field>
      <app-field [label]="'operator.profile.identity.district' | translate" for="pi-district">
        <select id="pi-district" class="select" #district [disabled]="!districts().length" (change)="set('districtId', district.value)">
          <option value="" [selected]="!f.districtId">—</option>
          @for (d of districts(); track d.id) {
            <option [value]="d.id" [selected]="d.id === f.districtId">{{ d | loc }}</option>
          }
        </select>
      </app-field>
      <app-field [label]="'operator.profile.identity.address' | translate" for="pi-address">
        <input id="pi-address" class="input" #address [value]="f.addressLine" (input)="set('addressLine', address.value)" />
      </app-field>
      <app-field [label]="'operator.profile.identity.coordinates' | translate" for="pi-lat">
        <div class="row">
          <input id="pi-lat" class="input ltr" type="number" step="any" #lat [value]="f.latitude" [attr.aria-label]="'operator.profile.identity.latitude' | translate" [placeholder]="'operator.profile.identity.latitude' | translate" (input)="set('latitude', lat.value)" />
          <input class="input ltr" type="number" step="any" #lng [value]="f.longitude" [attr.aria-label]="'operator.profile.identity.longitude' | translate" [placeholder]="'operator.profile.identity.longitude' | translate" (input)="set('longitude', lng.value)" />
        </div>
      </app-field>
      <div class="field">
        <label for="pi-lic">{{ 'operator.profile.identity.license' | translate }}</label>
        <input id="pi-lic" class="input ltr" #lic [value]="f.tourismLicenseNo" (input)="set('tourismLicenseNo', lic.value)" />
        @if (!property().identity.tourismLicenseNo) {
          <div class="help"><span class="red b">{{ 'operator.profile.identity.licenseRequired' | translate }}</span></div>
        }
      </div>
    </div>
    <app-save-bar [busy]="saving.busy()" (save)="save()" (revert)="revert()" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdentityTabComponent {
  private readonly api = inject(HostPropertiesApi);
  private readonly toast = inject(ToastService);
  protected readonly catalog = inject(CatalogService);

  readonly property = input.required<ManagedProperty>();
  readonly saved = output<ManagedProperty>();

  protected readonly saving = new Mutation();
  protected readonly form = linkedSignal(() => toForm(this.property()));
  protected readonly districts = computed(() => this.catalog.city(this.form().cityId)?.districts ?? []);

  protected set<K extends keyof IdentityForm>(key: K, value: IdentityForm[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  /** Changing the city clears a district of the previous city. */
  protected setCity(cityId: string): void {
    this.form.update((f) => ({ ...f, cityId, districtId: '' }));
  }

  protected save(): void {
    const f = this.form();
    if (!f.nameAr.trim()) {
      this.toast.error('operator.profile.identity.nameRequired');
      return;
    }
    const body: PropertyBody = {
      nameAr: f.nameAr.trim(),
      nameEn: f.nameEn.trim() || null,
      typeId: f.typeId,
      cityId: f.cityId || null,
      districtId: f.districtId || null,
      addressLine: f.addressLine.trim() || null,
      latitude: toNumber(f.latitude),
      longitude: toNumber(f.longitude),
      tourismLicenseNo: f.tourismLicenseNo.trim() || null,
    };
    this.saving.run(this.api.update(this.property().id, body), (p) => {
      this.toast.success('operator.profile.identity.saved');
      this.saved.emit(p);
    });
  }

  protected revert(): void {
    this.form.set(toForm(this.property()));
    this.toast.show('operator.profile.reverted');
  }
}
