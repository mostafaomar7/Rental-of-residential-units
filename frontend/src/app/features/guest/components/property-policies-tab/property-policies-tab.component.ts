import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PropertyPolicies } from '@api/dto';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { IconComponent } from '@shared/ui/icon/icon.component';

/** Platform-wide identity rules (`guest.property.policies.identity.items.1..n`). */
const IDENTITY_ITEMS = [1, 2, 3];

/**
 * The property's policies (SRS §POL): times, house rules, damage, cancellation tiers and identity.
 * Shown on the unit page and, before acceptance, in the booking wizard.
 */
@Component({
  selector: 'app-property-policies-tab',
  imports: [TranslatePipe, LocalizePipe, AppDatePipe, IconComponent],
  template: `
    @let pol = policies();
    <div class="stack">
      <div class="soft-lg">
        <div class="row bb mb-8"><app-icon name="clock" class="gold-dark" />{{ 'guest.property.policies.checkTimes.title' | translate }}</div>
        <div class="row-top small mt-4 item">
          <span class="gold">•</span><span class="lh">{{ 'guest.property.policies.checkTimes.checkIn' | translate: { time: (pol.checkInTime | appDate: 'time') } }}</span>
        </div>
        <div class="row-top small mt-4 item">
          <span class="gold">•</span><span class="lh">{{ 'guest.property.policies.checkTimes.checkOut' | translate: { time: (pol.checkOutTime | appDate: 'time') } }}</span>
        </div>
        <div class="row-top small mt-4 item">
          <span class="gold">•</span><span class="lh">{{ 'guest.property.policies.checkTimes.changes' | translate }}</span>
        </div>
      </div>

      <div class="soft-lg">
        <div class="row bb mb-8"><app-icon name="scroll-text" class="gold-dark" />{{ 'guest.property.policies.rules.title' | translate }}</div>
        <p class="small lh pre-line">{{ pol.houseRulesAr || ('guest.property.policies.none' | translate) }}</p>
      </div>

      <div class="soft-lg">
        <div class="row bb mb-8"><app-icon name="shield-alert" class="gold-dark" />{{ 'guest.property.policies.damage.title' | translate }}</div>
        <p class="small lh pre-line">{{ pol.damagePolicyAr || ('guest.property.policies.none' | translate) }}</p>
      </div>

      <div class="soft-lg">
        <div class="row bb mb-8">
          <app-icon name="calendar-x" class="gold-dark" />{{ 'guest.property.policies.cancellation.title' | translate }}
          @if (pol.cancellation) {
            <span class="pill pill-gold">{{ pol.cancellation | loc }}</span>
          }
        </div>
        @if (pol.cancellation) {
          <p class="small lh">{{ pol.cancellation | loc: 'description' }}</p>
        }
        @for (rule of rules(); track rule.minHoursBefore) {
          <div class="row-top small mt-4 item">
            <span class="gold">•</span>
            <span class="lh">
              {{ (rule.minHoursBefore ? 'guest.property.policies.cancellation.rule' : 'guest.property.policies.cancellation.ruleAnyTime') | translate: { percent: rule.refundPercent, hours: rule.minHoursBefore } }}
            </span>
          </div>
        }
      </div>

      <div class="soft-lg">
        <div class="row bb mb-8"><app-icon name="id-card" class="gold-dark" />{{ 'guest.property.policies.identity.title' | translate }}</div>
        @for (n of identityItems; track n) {
          <div class="row-top small mt-4 item">
            <span class="gold">•</span><span class="lh">{{ 'guest.property.policies.identity.items.' + n | translate }}</span>
          </div>
        }
      </div>

      <p class="xs muted">{{ 'guest.property.policies.version' | translate: { version: pol.version } }}</p>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .item {
      gap: 8px;
    }
    .pre-line {
      white-space: pre-line;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyPoliciesTabComponent {
  readonly policies = input.required<PropertyPolicies>();

  protected readonly identityItems = IDENTITY_ITEMS;
  /** Refund tiers, earliest cancellation first. */
  protected readonly rules = computed(() => [...(this.policies().cancellation?.rules ?? [])].sort((a, b) => b.minHoursBefore - a.minHoursBefore));
}
