import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CatalogService } from '@core/services/catalog.service';
import { LangService } from '@core/services/lang.service';
import { localize } from '@shared/pipes/localize.pipe';
import { RadioCardOption, RadioCardsComponent } from '../../../components/radio-cards.component';
import { AddPropertyWizardService } from '../add-property-wizard.service';

/** Icon per property-type code; other types get a house. */
const TYPE_ICONS: Record<string, string> = { apartment: 'building', hotel: 'hotel', villa: 'castle', chalet: 'trees', studio: 'home' };

/** Step 1 — property type (platform catalogue). */
@Component({
  selector: 'app-step-type',
  imports: [TranslatePipe, RadioCardsComponent],
  template: `
    <h3 class="h3 mb-16">{{ 'operator.add.type.title' | translate }}</h3>
    <app-radio-cards [options]="options()" [selected]="wizard.form().typeId" (picked)="wizard.patch({ typeId: $event })" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepTypeComponent {
  private readonly catalog = inject(CatalogService);
  private readonly lang = inject(LangService);
  protected readonly wizard = inject(AddPropertyWizardService);

  /** Catalogue names are content (already localised), passed to the cards as their label text. */
  protected readonly options = computed<RadioCardOption[]>(() =>
    this.catalog.propertyTypes().map((t) => ({
      value: t.id,
      icon: TYPE_ICONS[t.code.toLowerCase()] ?? 'home',
      label: localize(t, 'name', this.lang.lang()),
    })),
  );
}
