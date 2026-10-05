import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { AdminBusinessApi } from '@api/endpoints/admin-business.api';
import { ClipboardService } from '@core/services/clipboard.service';
import { ToastService } from '@core/services/toast.service';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { KvComponent } from '@shared/ui/kv/kv.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { ReasonModalComponent } from '../../components/reason-modal.component';
import { ResourceStateComponent } from '../../components/resource-state.component';

/** Full IBAN of an owner's payout account (the read is audited) with the verify / reject decision. */
@Component({
  selector: 'app-bank-account-modal',
  imports: [TranslatePipe, FORMAT_PIPES, ModalComponent, KvComponent, IconComponent, StatusPillComponent, ResourceStateComponent, ReasonModalComponent],
  template: `
    <app-modal size="sm" [title]="'admin.bank.title' | translate" (closed)="closed.emit()">
      <app-resource-state [resource]="account" />
      @if (account.hasValue()) {
        @let a = account.value();
        <div class="notice blue small mb-12">
          <app-icon name="shield-check" />
          <div>{{ 'admin.bank.auditedNotice' | translate }}</div>
        </div>
        <app-kv [label]="'admin.bank.cols.owner' | translate">{{ a.owner?.fullName ?? '—' }}</app-kv>
        <app-kv [label]="'admin.bank.accountName' | translate"><span dir="auto">{{ a.accountName }}</span></app-kv>
        <app-kv [label]="'admin.bank.cols.bank' | translate">{{ a.bankName }}</app-kv>
        <app-kv [label]="'admin.bank.cols.iban' | translate">
          <button type="button" class="kbd" [attr.aria-label]="'admin.bank.copyIban' | translate" (click)="clipboard.copy(a.iban)">{{ a.iban }}</button>
        </app-kv>
        <app-kv [label]="'admin.bank.cols.status' | translate"><app-status-pill domain="bankAccount" [code]="a.status" /></app-kv>
        @if (a.verifiedAt) {
          <app-kv [label]="'admin.bank.verifiedAt' | translate">{{ a.verifiedAt | appDate: 'dateTime' }}</app-kv>
        }
        @if (a.rejectionReason) {
          <div class="notice red small mt-12">
            <app-icon name="x-circle" />
            <div>{{ a.rejectionReason }}</div>
          </div>
        }

        @if (rejecting()) {
          <app-reason-modal title="admin.bank.rejectTitle" okLabel="admin.bank.reject" [busy]="busy()" (confirmed)="review(false, $event)" (closed)="rejecting.set(false)" />
        }
      }
      <ng-container modal-footer>
        @if (account.hasValue() && account.value().status === 'PENDING') {
          <button type="button" class="btn btn-success" [disabled]="busy()" (click)="review(true)"><app-icon name="check" size="sm" />{{ 'admin.bank.verify' | translate }}</button>
          <button type="button" class="btn btn-danger" [disabled]="busy()" (click)="rejecting.set(true)">{{ 'admin.bank.reject' | translate }}</button>
        }
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.close' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BankAccountModalComponent {
  private readonly api = inject(AdminBusinessApi);
  private readonly toast = inject(ToastService);
  protected readonly clipboard = inject(ClipboardService);

  readonly ownerId = input.required<Uuid>();
  readonly changed = output<void>();
  readonly closed = output<void>();

  protected readonly account = rxResource({ params: () => this.ownerId(), stream: ({ params }) => this.api.bankAccount(params) });
  protected readonly busy = signal(false);
  protected readonly rejecting = signal(false);

  protected review(approve: boolean, reason?: string): void {
    this.busy.set(true);
    this.api.reviewBankAccount(this.ownerId(), approve, reason).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.rejecting.set(false);
        // Keep the full IBAN on screen: the review response may carry the masked one.
        this.account.update((a) => (a ? { ...a, status: updated.status, verifiedAt: updated.verifiedAt, rejectionReason: updated.rejectionReason } : updated));
        this.toast.success(approve ? 'admin.bank.verified' : 'admin.bank.rejected');
        this.changed.emit();
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
