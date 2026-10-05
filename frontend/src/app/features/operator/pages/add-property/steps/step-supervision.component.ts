import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { OperatingModel } from '@api/dto';
import { RadioCardsComponent } from '../../../components/radio-cards.component';
import { OPERATING_MODEL_OPTIONS } from '../../property-profile/tabs/operations-tab.component';
import { AddPropertyWizardService } from '../add-property-wizard.service';

/** Step 7 — operating model (drives commission and whether a smart lock is needed). */
@Component({
  selector: 'app-step-supervision',
  imports: [TranslatePipe, RadioCardsComponent],
  template: `
    <h3 class="h3 mb-16">{{ 'operator.add.supervision.title' | translate }}</h3>
    <app-radio-cards [options]="options" [selected]="wizard.form().operatingModel" (picked)="pick($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepSupervisionComponent {
  protected readonly wizard = inject(AddPropertyWizardService);
  protected readonly options = OPERATING_MODEL_OPTIONS;

  protected pick(value: string): void {
    this.wizard.patch({ operatingModel: value as OperatingModel });
  }
}
