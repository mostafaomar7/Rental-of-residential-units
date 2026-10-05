import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { PriceRecommendation, RecommendationDecision } from '@api/dto';
import { AppDatePipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';

/** One day's suggestion with its reasons: approve, reject, or apply an edited price. */
@Component({
  selector: 'app-price-day-dialog',
  imports: [FormsModule, TranslatePipe, AppDatePipe, SarPipe, LocalizePipe, FieldComponent, IconComponent, ModalComponent, StatusPillComponent],
  template: `
    @let r = rec();
    <app-modal size="sm" [title]="r.date | appDate: 'long'" [subtitle]="r.unit.name" (closed)="closed.emit()">
      <div class="grid g2">
        <div class="soft center">
          <div class="xs muted b">{{ 'operator.pricing.day.current' | translate }}</div>
          <div class="h3">{{ r.currentPrice | sar }}</div>
        </div>
        <div class="soft center suggested">
          <div class="xs muted b">{{ 'operator.pricing.day.suggested' | translate }}</div>
          <div class="h3" [class]="r.direction === 'DOWN' ? 'navy' : 'green'">{{ r.recommendedPrice | sar }}</div>
        </div>
      </div>
      <div class="bb mt-16 mb-8">{{ 'operator.pricing.day.why' | translate }}</div>
      @for (reason of r.reasons; track reason.code) {
        <div class="li mt-4">
          <span class="li-ic gold"><app-icon name="sparkles" size="sm" /></span>
          <div class="grow b small">{{ reason | loc: 'label' }}</div>
          <span class="xs b" [class]="reason.impactPercent >= 0 ? 'green' : 'red'">{{ reason.impactPercent > 0 ? '+' : '' }}{{ reason.impactPercent }}%</span>
        </div>
      }
      <p class="xs muted mt-12">
        {{ 'operator.pricing.day.status' | translate }}
        <app-status-pill domain="recommendation" [code]="r.status" />
        @if (r.appliedPrice !== null) {
          • {{ r.appliedPrice | sar }}
        }
      </p>
      @if (pending()) {
        <app-field [label]="'operator.pricing.day.edit' | translate" for="pr-edit">
          <input id="pr-edit" class="input" type="number" min="1" [(ngModel)]="price" />
        </app-field>
      }
      <ng-container modal-footer>
        @if (pending()) {
          @if (edited()) {
            <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="decided.emit({ id: r.id, action: 'EDIT', price: price() ?? 0 })">
              {{ 'operator.pricing.day.applyEdited' | translate }}
            </button>
          } @else {
            <button type="button" class="btn btn-success" [disabled]="busy()" (click)="decided.emit({ id: r.id, action: 'APPROVE' })">
              {{ 'operator.pricing.approve' | translate }}
            </button>
          }
          <button type="button" class="btn btn-danger" [disabled]="busy()" (click)="decided.emit({ id: r.id, action: 'REJECT' })">
            {{ 'operator.pricing.reject' | translate }}
          </button>
        } @else {
          <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.close' | translate }}</button>
        }
      </ng-container>
    </app-modal>
  `,
  styles: `
    .suggested {
      background: #fbf6ec;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceDayDialogComponent {
  readonly rec = input.required<PriceRecommendation>();
  readonly busy = input(false);
  readonly closed = output<void>();
  readonly decided = output<RecommendationDecision>();

  protected readonly price = linkedSignal<number | null>(() => this.rec().recommendedPrice);
  protected readonly pending = computed(() => this.rec().status === 'PENDING');
  /** A different, valid price was typed — approving becomes an EDIT. */
  protected readonly edited = computed(() => {
    const price = this.price();
    return price !== null && price > 0 && price !== this.rec().recommendedPrice;
  });
}
