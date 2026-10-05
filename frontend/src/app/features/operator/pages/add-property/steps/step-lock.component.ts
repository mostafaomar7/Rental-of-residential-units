import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Lock } from '@api/dto';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PairLockDialogComponent, PairableUnit } from '../../../components/locks/pair-lock-dialog.component';
import { AddPropertyWizardService } from '../add-property-wizard.service';

/** Step 8 — pair a smart lock with the first unit (needed for self-service; optional otherwise). */
@Component({
  selector: 'app-step-lock',
  imports: [TranslatePipe, IconComponent, PairLockDialogComponent],
  template: `
    <h3 class="h3 mb-16">{{ 'operator.add.lock.title' | translate }}</h3>
    @if (wizard.lock(); as lock) {
      <div class="notice green">
        <app-icon name="badge-check" />
        <div>
          <b>{{ 'operator.add.lock.paired' | translate }}</b><br />
          {{ 'domain.api.lockProvider.' + lock.provider | translate }} • <span class="ltr">{{ lock.externalId }}</span>
        </div>
      </div>
    } @else {
      <p class="small muted mb-16">{{ 'operator.add.lock.hint' | translate }}</p>
      <button type="button" class="btn btn-primary" [disabled]="!units().length" (click)="pairing.set(true)">
        <app-icon name="bluetooth" size="sm" />{{ 'operator.add.lock.startPairing' | translate }}
      </button>
      @if (wizard.form().operatingModel === 'SELF_SERVICE') {
        <div class="notice amber mt-16 small">
          <app-icon name="alert-triangle" />
          <div>{{ 'operator.add.lock.selfRequires' | translate }}</div>
        </div>
      }
    }

    @if (pairing()) {
      <app-pair-lock-dialog [units]="units()" (closed)="pairing.set(false)" (paired)="onPaired($event)" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepLockComponent {
  protected readonly wizard = inject(AddPropertyWizardService);
  protected readonly pairing = signal(false);

  protected readonly units = computed<PairableUnit[]>(() => {
    const unit = this.wizard.unit();
    return unit ? [{ id: unit.id, label: unit.name }] : [];
  });

  protected onPaired(lock: Lock): void {
    this.pairing.set(false);
    this.wizard.lock.set(lock);
  }
}
