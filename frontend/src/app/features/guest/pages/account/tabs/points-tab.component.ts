import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MeApi } from '@api/endpoints/me.api';
import { ClipboardService } from '@core/services/clipboard.service';
import { FormatService } from '@core/services/format.service';
import { LangService } from '@core/services/lang.service';
import { ToastService } from '@core/services/toast.service';
import { AppDatePipe, NumPipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoadStateComponent } from '../../../components/load-state/load-state.component';
import { PagerComponent } from '../../../components/pager/pager.component';
import { WalletService } from '../../../services/wallet.service';

const PAGE_SIZE = 15;

/** Loyalty points: balance, redemption to the wallet, referral code, tiers and the points ledger (SRS §LOY). */
@Component({
  selector: 'app-points-tab',
  imports: [TranslatePipe, LocalizePipe, SarPipe, NumPipe, AppDatePipe, IconComponent, EmptyStateComponent, LoadStateComponent, PagerComponent],
  templateUrl: './points-tab.component.html',
  styles: `
    :host {
      display: block;
    }
    .big-ic {
      width: 56px;
      height: 56px;
    }
    .ref-code {
      letter-spacing: 3px;
    }
    .reward-pill {
      background: var(--gold);
      color: var(--navy);
    }
    .faint {
      color: rgba(255, 255, 255, 0.65);
    }
    .current {
      outline: 2px solid var(--gold);
      background: #fbf6ec;
    }
    .tx {
      padding: 12px 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PointsTabComponent {
  private readonly meApi = inject(MeApi);
  private readonly format = inject(FormatService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LangService);
  private readonly wallet = inject(WalletService);
  protected readonly clipboard = inject(ClipboardService);

  protected readonly loyalty = rxResource({ stream: () => this.meApi.loyalty() });

  protected readonly pageNo = signal(1);
  protected readonly ledger = rxResource({
    params: () => this.pageNo(),
    stream: ({ params }) => this.meApi.points({ page: params, limit: PAGE_SIZE }),
  });

  protected readonly busy = signal(false);

  protected readonly shareUrl = computed(() => {
    this.lang.lang();
    if (!this.loyalty.hasValue()) return null;
    const { code, bonus } = this.loyalty.value().referral;
    const text = this.translate.instant('account.points.shareText', { code, amount: this.format.sar(bonus) });
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  });

  /** Converts every redeemable block of points into wallet credit. */
  protected redeem(): void {
    if (!this.loyalty.hasValue()) return;
    const { redeemablePoints } = this.loyalty.value().redemption;
    this.busy.set(true);
    this.meApi.redeemPoints(redeemablePoints).subscribe({
      next: (result) => {
        this.busy.set(false);
        this.toast.success('account.points.redeemed', { points: this.format.num(result.pointsRedeemed), amount: this.format.sar(result.value) });
        this.loyalty.reload();
        this.ledger.reload();
        this.wallet.reload();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
