import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { AddPropertyWizardService, WIZARD_STEPS } from './add-property-wizard.service';
import { StepAmenitiesComponent } from './steps/step-amenities.component';
import { StepLocationComponent } from './steps/step-location.component';
import { StepLockComponent } from './steps/step-lock.component';
import { StepPhotosComponent } from './steps/step-photos.component';
import { StepPoliciesComponent } from './steps/step-policies.component';
import { StepReviewComponent } from './steps/step-review.component';
import { StepSupervisionComponent } from './steps/step-supervision.component';
import { StepTypeComponent } from './steps/step-type.component';
import { StepUnitsComponent } from './steps/step-units.component';

/** `/operator/add` — onboarding wizard: creates a draft, fills it step by step and submits it for review (SRS PRP-01). */
@Component({
  selector: 'app-add-property-page',
  imports: [
    RouterLink,
    TranslatePipe,
    LocalizePipe,
    IconComponent,
    PageHeaderComponent,
    StatusPillComponent,
    StepTypeComponent,
    StepLocationComponent,
    StepUnitsComponent,
    StepAmenitiesComponent,
    StepPhotosComponent,
    StepPoliciesComponent,
    StepSupervisionComponent,
    StepLockComponent,
    StepReviewComponent,
  ],
  providers: [AddPropertyWizardService],
  templateUrl: './add-property.page.html',
  styles: `
    .wizard {
      max-width: 900px;
    }
    .done {
      padding: 24px 0;
    }
    .done-ic {
      width: 72px;
      height: 72px;
      margin: 0 auto;
    }
    .center-row {
      justify-content: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddPropertyPage {
  protected readonly wizard = inject(AddPropertyWizardService);

  protected readonly steps = WIZARD_STEPS;
  protected readonly total = WIZARD_STEPS.length;
}
