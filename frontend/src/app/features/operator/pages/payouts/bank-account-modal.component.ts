import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { BankAccount } from '@api/dto';
import { HostInsightsApi } from '@api/endpoints/host-insights.api';
import { ToastService } from '@core/services/toast.service';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { Mutation } from '../../services/mutation';

/** Saudi IBAN: `SA` + 22 digits (spaces allowed while typing). */
const IBAN_PATTERN = /^SA\d{22}$/;

/** Payout bank account form; a new IBAN goes back to verification before the next payout. */
@Component({
  selector: 'app-bank-account-modal',
  imports: [FormsModule, TranslatePipe, IconComponent, FieldComponent, ModalComponent],
  template: `
    <app-modal size="sm" [title]="'operations.payouts.bank.title' | translate" (closed)="closed.emit()">
      <div class="stack">
        <app-field [label]="'operations.payouts.bank.accountName' | translate" for="ba-name">
          <input id="ba-name" class="input" [(ngModel)]="accountName" />
        </app-field>
        <app-field [label]="'operations.payouts.bank.bankName' | translate" for="ba-bank">
          <input id="ba-bank" class="input" [(ngModel)]="bankName" />
        </app-field>
        <app-field
          [label]="'operations.payouts.bank.iban' | translate"
          for="ba-iban"
          [error]="iban() && !ibanValid() ? ('operations.payouts.bank.ibanInvalid' | translate) : undefined"
        >
          <input id="ba-iban" class="input ltr d-block" placeholder="SA00 0000 0000 0000 0000 0000" [(ngModel)]="iban" />
        </app-field>
        <div class="notice amber small">
          <app-icon name="shield-check" />
          <div>{{ 'operations.payouts.bank.verificationNotice' | translate }}</div>
        </div>
      </div>
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="saving.busy() || !valid()" (click)="save()">{{ 'common.save' | translate }}</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BankAccountModalComponent {
  private readonly api = inject(HostInsightsApi);
  private readonly toast = inject(ToastService);

  readonly account = input<BankAccount | null>(null);
  readonly closed = output<void>();
  readonly saved = output<BankAccount>();

  protected readonly accountName = linkedSignal(() => this.account()?.accountName ?? '');
  protected readonly bankName = linkedSignal(() => this.account()?.bankName ?? '');
  /** The API only returns the masked IBAN, so it is always typed again. */
  protected readonly iban = signal('');
  protected readonly saving = new Mutation();

  private readonly normalizedIban = computed(() => this.iban().replace(/\s/g, '').toUpperCase());
  protected readonly ibanValid = computed(() => IBAN_PATTERN.test(this.normalizedIban()));
  protected readonly valid = computed(() => !!this.accountName().trim() && !!this.bankName().trim() && this.ibanValid());

  protected save(): void {
    if (!this.valid()) return;
    const body = { accountName: this.accountName().trim(), bankName: this.bankName().trim(), iban: this.normalizedIban() };
    this.saving.run(this.api.saveBankAccount(body), (account) => {
      this.toast.success('operations.payouts.bank.saved');
      this.saved.emit(account);
    });
  }
}
