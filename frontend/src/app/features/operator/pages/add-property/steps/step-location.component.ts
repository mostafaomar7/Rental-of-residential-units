import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CatalogService } from '@core/services/catalog.service';
import { ToastService } from '@core/services/toast.service';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { AddPropertyWizardService, MIN_DESCRIPTION_LENGTH, mapPin } from '../add-property-wizard.service';

/** Coordinates are stored with ~1 m precision. */
const PIN_DECIMALS = 6;

/** Step 2 — names, location (with map pin), description and tourism licence (saving it creates the draft). */
@Component({
  selector: 'app-step-location',
  imports: [TranslatePipe, LocalizePipe, FieldComponent, IconComponent],
  template: `
    @let f = wizard.form();
    <h3 class="h3 mb-16">{{ 'operator.add.location.title' | translate }}</h3>
    <div class="grid g2">
      <app-field [label]="'operator.add.location.nameAr' | translate" for="w-name-ar">
        <input
          id="w-name-ar"
          class="input"
          dir="rtl"
          #nameAr
          [value]="f.nameAr"
          [placeholder]="'operator.add.location.namePlaceholder' | translate"
          (input)="wizard.patch({ nameAr: nameAr.value })"
        />
      </app-field>
      <app-field [label]="'operator.add.location.nameEn' | translate" for="w-name-en">
        <input id="w-name-en" class="input" dir="ltr" #nameEn [value]="f.nameEn" (input)="wizard.patch({ nameEn: nameEn.value })" />
      </app-field>
      <app-field [label]="'operator.add.location.city' | translate" for="w-city">
        <select id="w-city" class="select" #city (change)="wizard.patch({ cityId: city.value, districtId: '' })">
          <option value="" [selected]="!f.cityId" disabled>{{ 'operator.add.location.pickCity' | translate }}</option>
          @for (c of catalog.cities(); track c.id) {
            <option [value]="c.id" [selected]="c.id === f.cityId">{{ c | loc }}</option>
          }
        </select>
      </app-field>
      <app-field [label]="'operator.add.location.district' | translate" for="w-district">
        <select id="w-district" class="select" #district [disabled]="!districts().length" (change)="wizard.patch({ districtId: district.value })">
          <option value="" [selected]="!f.districtId">—</option>
          @for (d of districts(); track d.id) {
            <option [value]="d.id" [selected]="d.id === f.districtId">{{ d | loc }}</option>
          }
        </select>
      </app-field>
      <app-field [label]="'operator.add.location.address' | translate" for="w-address">
        <input id="w-address" class="input" #address [value]="f.addressLine" placeholder="RHTA1234" (input)="wizard.patch({ addressLine: address.value })" />
      </app-field>
      <app-field [label]="'operator.add.location.license' | translate" for="w-license" [help]="'operator.add.location.licenseHelp' | translate">
        <input id="w-license" class="input ltr" #license [value]="f.tourismLicenseNo" (input)="wizard.patch({ tourismLicenseNo: license.value })" />
      </app-field>
    </div>

    <app-field [label]="'operator.add.location.pin' | translate" for="w-lat" [help]="'operator.add.location.pinHelp' | translate">
      <div class="grid g2">
        <input
          id="w-lat"
          class="input ltr"
          type="number"
          step="any"
          #lat
          [value]="f.latitude"
          [placeholder]="'operator.add.location.latitude' | translate"
          [attr.aria-label]="'operator.add.location.latitude' | translate"
          (input)="wizard.patch({ latitude: lat.value })"
        />
        <input
          class="input ltr"
          type="number"
          step="any"
          #lng
          [value]="f.longitude"
          [placeholder]="'operator.add.location.longitude' | translate"
          [attr.aria-label]="'operator.add.location.longitude' | translate"
          (input)="wizard.patch({ longitude: lng.value })"
        />
      </div>
    </app-field>
    <div class="row wrap gap-8">
      <button type="button" class="btn btn-ghost btn-sm" [disabled]="locating()" (click)="useMyLocation()">
        <app-icon name="navigation" size="sm" />{{ (locating() ? 'operator.add.location.locating' : 'operator.add.location.useMyLocation') | translate }}
      </button>
      @if (mapUrl(); as url) {
        <a class="btn btn-ghost btn-sm" [href]="url" target="_blank" rel="noopener"><app-icon name="map-pin" size="sm" />{{ 'operator.add.location.checkOnMap' | translate }}</a>
      }
    </div>

    <app-field
      class="mt-16"
      [label]="'operator.add.location.descriptionAr' | translate"
      for="w-desc-ar"
      [help]="'operator.add.location.descriptionCount' | translate: { count: descriptionLength(), min: minDescription }"
    >
      <textarea
        id="w-desc-ar"
        class="textarea"
        dir="rtl"
        #descAr
        [value]="f.descriptionAr"
        [placeholder]="'operator.add.location.descriptionPlaceholder' | translate"
        (input)="wizard.patch({ descriptionAr: descAr.value })"
      ></textarea>
    </app-field>
    <app-field [label]="'operator.add.location.descriptionEn' | translate" for="w-desc-en">
      <textarea id="w-desc-en" class="textarea" dir="ltr" #descEn [value]="f.descriptionEn" (input)="wizard.patch({ descriptionEn: descEn.value })"></textarea>
    </app-field>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepLocationComponent {
  protected readonly catalog = inject(CatalogService);
  protected readonly wizard = inject(AddPropertyWizardService);
  private readonly toast = inject(ToastService);

  protected readonly minDescription = MIN_DESCRIPTION_LENGTH;
  protected readonly locating = signal(false);
  protected readonly districts = computed(() => this.catalog.city(this.wizard.form().cityId)?.districts ?? []);
  protected readonly descriptionLength = computed(() => this.wizard.form().descriptionAr.trim().length);
  protected readonly mapUrl = computed(() => {
    const pin = mapPin(this.wizard.form());
    return pin ? `https://www.google.com/maps?q=${pin.latitude},${pin.longitude}` : null;
  });

  /** Fills the pin from the device location (the owner is usually at the property when listing it). */
  protected useMyLocation(): void {
    if (!navigator.geolocation) {
      this.toast.error('operator.add.location.locationUnavailable');
      return;
    }
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.locating.set(false);
        this.wizard.patch({ latitude: coords.latitude.toFixed(PIN_DECIMALS), longitude: coords.longitude.toFixed(PIN_DECIMALS) });
      },
      () => {
        this.locating.set(false);
        this.toast.error('operator.add.location.locationUnavailable');
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }
}
