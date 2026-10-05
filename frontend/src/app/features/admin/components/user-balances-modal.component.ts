import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminUser } from '@api/dto';
import { AdminBusinessApi } from '@api/endpoints/admin-business.api';
import { ToastService } from '@core/services/toast.service';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { ResourceStateComponent } from './resource-state.component';

/** Wallet transactions previewed under the balance. */
const RECENT_TX = 5;

/** Wallet balance and loyalty points of a guest, with manual adjustments (positive = credit). */
@Component({
  selector: 'app-user-balances-modal',
  imports: [FormsModule, TranslatePipe, FORMAT_PIPES, LocalizePipe, ModalComponent, FieldComponent, ResourceStateComponent],
  template: `
    <app-modal size="lg" [title]="'admin.users.balances.title' | translate: { name: user().fullName }" (closed)="closed.emit()">
      <div class="grid g2">
        <div>
          <div class="bb mb-8">{{ 'admin.users.balances.wallet' | translate }}</div>
          <app-resource-state [resource]="wallet" />
          @if (wallet.hasValue()) {
            @let w = wallet.value();
            <div class="soft-lg">
              <div class="xs muted b">{{ 'admin.users.balances.balance' | translate }}</div>
              <div class="h3">{{ w.balance | sar }}</div>
            </div>
            @let transactions = (w.transactions ?? []).slice(0, recentTx);
            @if (transactions.length) {
              <div class="rows mt-8">
                @for (tx of transactions; track tx.id) {
                  <div class="row between small tx">
                    <span>
                      {{ 'domain.api.walletTx.' + tx.type | translate }}
                      <span class="xs muted">• {{ tx.createdAt | appDate: 'medium' }}</span>
                    </span>
                    <span class="b ltr" [class]="tx.amount < 0 ? 'red' : 'green'">{{ tx.amount | sar }}</span>
                  </div>
                }
              </div>
            }
          }
          <div class="divider"></div>
          <app-field [label]="'admin.users.balances.amount' | translate" for="ub-amount" [help]="'admin.users.balances.signHelp' | translate">
            <input id="ub-amount" class="input" type="number" [(ngModel)]="walletAmount" />
          </app-field>
          <app-field [label]="'admin.users.balances.reason' | translate" for="ub-wreason">
            <input id="ub-wreason" class="input" [(ngModel)]="walletReason" />
          </app-field>
          <button type="button" class="btn btn-primary btn-sm" [disabled]="busy()" (click)="adjustWallet()">{{ 'admin.users.balances.adjustWallet' | translate }}</button>
        </div>

        <div>
          <div class="bb mb-8">{{ 'admin.users.balances.loyalty' | translate }}</div>
          <app-resource-state [resource]="loyalty" />
          @if (loyalty.hasValue()) {
            @let l = loyalty.value();
            <div class="soft-lg">
              <div class="xs muted b">{{ 'admin.users.balances.points' | translate }}</div>
              <div class="h3">{{ l.points.balance | num }}</div>
              <div class="xs muted">{{ 'admin.users.balances.tier' | translate: { tier: (l.tier | loc), lifetime: (l.points.lifetime | num) } }}</div>
            </div>
          }
          <div class="divider"></div>
          <app-field [label]="'admin.users.balances.pointsDelta' | translate" for="ub-points" [help]="'admin.users.balances.signHelp' | translate">
            <input id="ub-points" class="input" type="number" step="1" [(ngModel)]="points" />
          </app-field>
          <app-field [label]="'admin.users.balances.reason' | translate" for="ub-preason">
            <input id="ub-preason" class="input" [(ngModel)]="pointsReason" />
          </app-field>
          <button type="button" class="btn btn-primary btn-sm" [disabled]="busy()" (click)="adjustPoints()">{{ 'admin.users.balances.adjustPoints' | translate }}</button>
        </div>
      </div>
    </app-modal>
  `,
  styles: `
    .tx {
      padding: 8px 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserBalancesModalComponent {
  private readonly api = inject(AdminBusinessApi);
  private readonly toast = inject(ToastService);

  readonly user = input.required<AdminUser>();
  readonly closed = output<void>();

  protected readonly recentTx = RECENT_TX;
  protected readonly wallet = rxResource({ params: () => this.user().id, stream: ({ params }) => this.api.wallet(params) });
  protected readonly loyalty = rxResource({ params: () => this.user().id, stream: ({ params }) => this.api.loyalty(params) });

  protected readonly walletAmount = signal<number | null>(null);
  protected readonly walletReason = signal('');
  protected readonly points = signal<number | null>(null);
  protected readonly pointsReason = signal('');
  protected readonly busy = signal(false);

  protected adjustWallet(): void {
    const amount = Number(this.walletAmount());
    const reason = this.walletReason().trim();
    if (!amount || !reason) return this.toast.error('admin.users.balances.invalid');
    this.busy.set(true);
    this.api.adjustWallet(this.user().id, amount, reason).subscribe({
      next: () => {
        this.done('admin.users.balances.walletAdjusted');
        this.walletAmount.set(null);
        this.walletReason.set('');
        this.wallet.reload();
      },
      error: (err) => this.fail(err),
    });
  }

  protected adjustPoints(): void {
    const points = Number(this.points());
    const reason = this.pointsReason().trim();
    if (!points || !Number.isInteger(points) || !reason) return this.toast.error('admin.users.balances.invalid');
    this.busy.set(true);
    this.api.adjustPoints(this.user().id, points, reason).subscribe({
      next: () => {
        this.done('admin.users.balances.pointsAdjusted');
        this.points.set(null);
        this.pointsReason.set('');
        this.loyalty.reload();
      },
      error: (err) => this.fail(err),
    });
  }

  private done(key: string): void {
    this.busy.set(false);
    this.toast.success(key);
  }

  private fail(err: unknown): void {
    this.busy.set(false);
    this.toast.apiError(err);
  }
}
