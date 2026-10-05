import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CatalogService } from '@core/services/catalog.service';
import { FormatService } from '@core/services/format.service';
import { ToastService } from '@core/services/toast.service';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';

/** Wallet top-up with a custom amount within the platform's allowed range. */
@Component({
  selector: 'app-topup-dialog',
  imports: [TranslatePipe, FieldComponent, ModalComponent],
  template: `
    @let r = range();
    <app-modal size="sm" [title]="'account.wallet.customTitle' | translate" (closed)="closed.emit()">
      <app-field
        [label]="'account.wallet.amountLabel' | translate"
        for="tp-v"
        [help]="'account.wallet.amountHelp' | translate: { min: format.sar(r.min), max: format.sar(r.max) }"
      >
        <input
          id="tp-v"
          class="input"
          inputmode="numeric"
          [placeholder]="'account.wallet.amountPlaceholder' | translate"
          [value]="amount()"
          (input)="amount.set($any($event.target).value)"
          (keydown.enter)="submit()"
        />
      </app-field>
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="submit()">{{ 'account.wallet.topupButton' | translate }}</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopupDialogComponent {
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);
  protected readonly format = inject(FormatService);

  readonly busy = input(false);
  readonly submitted = output<number>();
  readonly closed = output<void>();

  protected readonly amount = signal('');
  protected readonly range = computed(() => {
    const topup = this.catalog.settings()?.wallet_topup;
    return { min: topup?.min ?? 1, max: topup?.max ?? Number.MAX_SAFE_INTEGER };
  });

  protected submit(): void {
    const value = Number(this.amount().trim());
    const { min, max } = this.range();
    if (!Number.isFinite(value) || value < min || value > max) {
      this.toast.error('account.wallet.invalidAmount', { min: this.format.num(min), max: this.format.num(max) });
      return;
    }
    this.submitted.emit(value);
  }
}
