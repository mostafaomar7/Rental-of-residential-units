import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CatalogService } from '@core/services/catalog.service';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { AddPropertyWizardService } from '../add-property-wizard.service';

/** Step 4 — amenities (platform catalogue). */
@Component({
  selector: 'app-step-amenities',
  imports: [TranslatePipe, LocalizePipe, IconComponent],
  template: `
    <h3 class="h3 mb-16">{{ 'operator.add.amenities.title' | translate }}</h3>
    <div class="chips">
      @for (a of catalog.amenities(); track a.id) {
        @let on = wizard.form().amenityIds.includes(a.id);
        <button type="button" class="chip" [class.on]="on" [attr.aria-pressed]="on" (click)="wizard.toggleAmenity(a.id)">
          @if (on) {
            <app-icon name="check" size="sm" />
          }
          {{ a | loc }}
        </button>
      }
    </div>
    <p class="xs muted mt-12">{{ 'operator.add.amenities.hint' | translate }}</p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepAmenitiesComponent {
  protected readonly catalog = inject(CatalogService);
  protected readonly wizard = inject(AddPropertyWizardService);
}
