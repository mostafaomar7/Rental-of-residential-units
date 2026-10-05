import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CatalogService } from '@core/services/catalog.service';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { FieldComponent } from '@shared/ui/field/field.component';
import { AddPropertyWizardService } from '../add-property-wizard.service';

/** Step 6 — cancellation policy, check-in / check-out times, house rules and damage policy. */
@Component({
  selector: 'app-step-policies',
  imports: [TranslatePipe, LocalizePipe, FieldComponent],
  template: `
    @let f = wizard.form();
    <h3 class="h3 mb-16">{{ 'operator.add.policies.title' | translate }}</h3>
    <app-field [label]="'operator.add.policies.cancellation' | translate" for="w-policy">
      <select id="w-policy" class="select" #policy (change)="wizard.patch({ cancellationPolicyId: policy.value })">
        <option value="" [selected]="!f.cancellationPolicyId">{{ 'operator.add.policies.platformDefault' | translate }}</option>
        @for (c of catalog.cancellationPolicies(); track c.id) {
          <option [value]="c.id" [selected]="c.id === f.cancellationPolicyId">{{ c | loc }}</option>
        }
      </select>
    </app-field>
    @if (selected(); as c) {
      <p class="xs muted">{{ c | loc: 'description' }}</p>
    }
    <div class="grid g2 mt-16">
      <app-field [label]="'operator.add.policies.checkIn' | translate" for="w-in">
        <input id="w-in" class="input" type="time" #checkIn [value]="wizard.checkInTime()" (change)="wizard.patch({ checkInTime: checkIn.value })" />
      </app-field>
      <app-field [label]="'operator.add.policies.checkOut' | translate" for="w-out">
        <input id="w-out" class="input" type="time" #checkOut [value]="wizard.checkOutTime()" (change)="wizard.patch({ checkOutTime: checkOut.value })" />
      </app-field>
    </div>
    <app-field [label]="'operator.add.policies.houseRules' | translate" for="w-rules">
      <textarea
        id="w-rules"
        class="textarea"
        dir="rtl"
        #rules
        [value]="f.houseRulesAr"
        [placeholder]="'operator.add.policies.houseRulesPlaceholder' | translate"
        (input)="wizard.patch({ houseRulesAr: rules.value })"
      ></textarea>
    </app-field>
    <app-field [label]="'operator.add.policies.damagePolicy' | translate" for="w-damage">
      <textarea
        id="w-damage"
        class="textarea"
        dir="rtl"
        #damage
        [value]="f.damagePolicyAr"
        [placeholder]="'operator.add.policies.damagePolicyPlaceholder' | translate"
        (input)="wizard.patch({ damagePolicyAr: damage.value })"
      ></textarea>
    </app-field>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepPoliciesComponent {
  protected readonly catalog = inject(CatalogService);
  protected readonly wizard = inject(AddPropertyWizardService);
  protected readonly selected = computed(() => this.catalog.cancellationPolicies().find((c) => c.id === this.wizard.form().cancellationPolicyId));
}
