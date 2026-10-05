import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { MeApi } from '@api/endpoints/me.api';
import { CatalogService } from '@core/services/catalog.service';
import { ConfirmService } from '@core/services/confirm.service';
import { FormatService } from '@core/services/format.service';
import { ToastService } from '@core/services/toast.service';
import { AppDatePipe, NumPipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoadStateComponent } from '../../../components/load-state/load-state.component';
import { PagerComponent } from '../../../components/pager/pager.component';
import { PaymentRedirectService } from '../../../services/payment-redirect.service';
import { WalletService } from '../../../services/wallet.service';
import { TopupDialogComponent } from '../components/topup-dialog.component';

const PAGE_SIZE = 15;

/** Digital wallet: balance, gateway top-ups and transaction history (SRS §WLT). */
@Component({
  selector: 'app-wallet-tab',
  imports: [TranslatePipe, LocalizePipe, SarPipe, NumPipe, AppDatePipe, EmptyStateComponent, IconComponent, LoadStateComponent, PagerComponent, TopupDialogComponent],
  templateUrl: './wallet-tab.component.html',
  styles: `
    :host {
      display: block;
    }
    .wallet-hero {
      padding: 32px;
    }
    .balance {
      font-size: 44px;
      font-weight: 900;
      line-height: 1.2;
    }
    .soft-white {
      color: rgba(255, 255, 255, 0.7);
    }
    .faint {
      color: rgba(255, 255, 255, 0.6);
    }
    .wallet-ic {
      width: 56px;
      height: 56px;
      background: rgba(255, 255, 255, 0.1);
      color: var(--gold);
    }
    .tx {
      padding: 12px 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletTabComponent {
  private readonly meApi = inject(MeApi);
  private readonly catalog = inject(CatalogService);
  private readonly confirm = inject(ConfirmService);
  private readonly format = inject(FormatService);
  private readonly toast = inject(ToastService);
  private readonly gateway = inject(PaymentRedirectService);
  protected readonly wallet = inject(WalletService);

  protected readonly presets = computed(() => this.catalog.settings()?.wallet_topup.presets ?? []);
  protected readonly customOpen = signal(false);
  protected readonly busy = signal(false);

  protected readonly pageNo = signal(1);
  protected readonly transactions = rxResource({
    params: () => this.pageNo(),
    stream: ({ params }) => this.meApi.walletTransactions({ page: params, limit: PAGE_SIZE }),
  });

  constructor() {
    this.wallet.reload();
  }

  protected async confirmTopUp(amount: number): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'account.wallet.topupTitle',
      message: 'account.wallet.topupConfirm',
      messageParams: { amount: this.format.sar(amount) },
      okLabel: 'account.wallet.topupNow',
    });
    if (ok) this.topUp(amount);
  }

  /** Creates the top-up payment and leaves for the gateway; it returns to the payment result page. */
  protected topUp(amount: number): void {
    this.customOpen.set(false);
    this.busy.set(true);
    this.meApi.topUp(amount).subscribe({
      next: (payment) => {
        if (!this.gateway.redirect(payment)) {
          this.busy.set(false);
          this.toast.error('errors.PAYMENT_GATEWAY_ERROR');
        }
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
