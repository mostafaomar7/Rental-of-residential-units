import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PropertyPolicies } from '@api/dto';
import { PropertyPoliciesTabComponent } from '../../../components/property-policies-tab/property-policies-tab.component';
import { BookingDraft } from '../booking-draft';
import { StepNavComponent } from './step-nav.component';

/**
 * Step 3 — the property's current policies; acceptance is required (SRS §POL). Continuing creates
 * the booking with this `policyVersion`, holding the dates for payment.
 */
@Component({
  selector: 'app-policy-step',
  imports: [TranslatePipe, PropertyPoliciesTabComponent, StepNavComponent],
  template: `
    <h2 class="h3">{{ 'account.booking.policies.title' | translate }}</h2>
    <p class="small muted mt-4 mb-16">{{ 'account.booking.policies.intro' | translate }}</p>
    <app-property-policies-tab [policies]="policies()" />

    <div class="stack-sm mt-24">
      <label class="check">
        <input type="checkbox" [checked]="draft().acceptPolicies" [disabled]="busy()" (change)="patch.emit({ acceptPolicies: $any($event.target).checked })" />
        <span><b>{{ 'account.booking.policies.ackPolicies' | translate }}</b> <span class="red">*</span></span>
      </label>
    </div>

    <app-step-nav
      label="account.booking.continueToPayment"
      [busy]="busy()"
      [blockedMessage]="draft().acceptPolicies ? null : 'account.booking.errors.ackRequired'"
      (back)="back.emit()"
      (next)="next.emit()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolicyStepComponent {
  readonly policies = input.required<PropertyPolicies>();
  readonly draft = input.required<BookingDraft>();
  /** The booking is being created. */
  readonly busy = input(false);

  readonly patch = output<Partial<BookingDraft>>();
  readonly back = output<void>();
  readonly next = output<void>();
}
