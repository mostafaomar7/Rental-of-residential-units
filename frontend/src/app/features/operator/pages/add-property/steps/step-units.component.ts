import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { UnitForm, UnitFormComponent } from '../../../components/unit-form.component';
import { AddPropertyWizardService } from '../add-property-wizard.service';

/** Step 3 — the first unit: capacity, prices and Wi-Fi (more units can be added from the profile). */
@Component({
  selector: 'app-step-units',
  imports: [TranslatePipe, UnitFormComponent],
  template: `
    <h3 class="h3 mb-8">{{ 'operator.add.units.title' | translate }}</h3>
    <p class="xs muted mb-16">{{ 'operator.add.units.hint' | translate }}</p>
    <app-unit-form idPrefix="w-unit" [value]="wizard.form().unit" (valueChange)="setUnit($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepUnitsComponent {
  protected readonly wizard = inject(AddPropertyWizardService);

  protected setUnit(unit: UnitForm): void {
    this.wizard.patch({ unit });
  }
}
