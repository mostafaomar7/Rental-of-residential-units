import { ChangeDetectionStrategy, Component, inject, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { OperatorPortfolioService } from '../services/operator-portfolio.service';

/** Drop-down of the portfolio's units grouped by property: `<app-unit-select [(value)]="unitId" />`. */
@Component({
  selector: 'app-unit-select',
  imports: [TranslatePipe, LocalizePipe],
  template: `
    <select class="select unit-select" [attr.aria-label]="'operator.common.unit' | translate" (change)="onChange($event)">
      @if (!value()) {
        <option value="" selected disabled>{{ 'operator.common.pickUnit' | translate }}</option>
      }
      @for (p of portfolio.properties(); track p.id) {
        <optgroup [label]="p | loc">
          @for (u of p.units; track u.id) {
            <option [value]="u.id" [selected]="u.id === value()">{{ u.name }}</option>
          }
        </optgroup>
      }
    </select>
  `,
  styles: `
    .unit-select {
      width: auto;
      min-width: 240px;
      max-width: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitSelectComponent {
  protected readonly portfolio = inject(OperatorPortfolioService);
  readonly value = model.required<Uuid | null>();

  protected onChange(event: Event): void {
    this.value.set((event.target as HTMLSelectElement).value || null);
  }
}
