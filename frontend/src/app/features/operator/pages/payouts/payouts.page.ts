import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';
import { BankAccount, Statement } from '@api/dto';
import { HostInsightsApi } from '@api/endpoints/host-insights.api';
import { FormatService } from '@core/services/format.service';
import { saveBlob } from '@core/utils/download.utils';
import { AppDatePipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { BarChartComponent, BarItem } from '@shared/ui/charts/bar-chart.component';
import { DonutChartComponent, DonutPart } from '@shared/ui/charts/donut-chart.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatTileComponent } from '@shared/ui/stat-tile/stat-tile.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { LoadErrorComponent, LoadingComponent } from '../../components/async-state.component';
import { PagerComponent } from '../../components/pager.component';
import { Mutation } from '../../services/mutation';
import { BankAccountModalComponent } from './bank-account-modal.component';

/** Statements shown in the table and the revenue chart (one per month). */
const STATEMENT_MONTHS = 12;
const EARNINGS_PAGE_SIZE = 15;
const SPLIT_COLORS = { net: '#0A1931', commission: '#C9A86A', fees: '#d9d2c2' } as const;

/** `/operator/payouts` — earnings ledger, monthly statements (CSV), revenue split and the payout account. */
@Component({
  selector: 'app-payouts-page',
  imports: [
    TranslatePipe,
    AppDatePipe,
    SarPipe,
    LocalizePipe,
    BarChartComponent,
    DonutChartComponent,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    StatTileComponent,
    StatusPillComponent,
    LoadingComponent,
    LoadErrorComponent,
    PagerComponent,
    BankAccountModalComponent,
  ],
  templateUrl: './payouts.page.html',
  styles: `
    .cards-grid {
      gap: 24px;
    }
    .bank-sub {
      color: rgba(255, 255, 255, 0.7);
    }
    .legend-navy {
      background: #0a1931;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayoutsPage {
  private readonly api = inject(HostInsightsApi);
  private readonly translate = inject(TranslateService);
  private readonly format = inject(FormatService);

  /** Re-evaluates translated chart labels once a new language is loaded. */
  private readonly langChange = toSignal(this.translate.onLangChange, { initialValue: null });

  protected readonly earningsPage = signal(1);
  protected readonly unsettledOnly = signal(false);
  protected readonly editingBank = signal(false);
  protected readonly downloading = new Mutation();

  protected readonly earnings = rxResource({
    params: () => ({ page: this.earningsPage(), limit: EARNINGS_PAGE_SIZE, unsettled: this.unsettledOnly() || undefined }),
    stream: ({ params }) => this.api.earnings(params),
  });

  protected readonly statements = rxResource({
    stream: () => this.api.statements({ limit: STATEMENT_MONTHS }).pipe(map((page) => page.items)),
  });

  protected readonly bank = rxResource({ stream: () => this.api.bankAccount() });
  protected readonly account = computed<BankAccount | null>(() => (this.bank.hasValue() ? this.bank.value() : null));

  /** Latest statement (the API lists newest first). */
  protected readonly current = computed<Statement | null>(() => (this.statements.hasValue() ? (this.statements.value()[0] ?? null) : null));

  protected readonly netShare = computed(() => {
    const cur = this.current();
    return cur?.gross ? Math.round((cur.net / cur.gross) * 100) : 0;
  });

  protected readonly split = computed<DonutPart[]>(() => {
    this.langChange();
    const cur = this.current();
    if (!cur) return [];
    const t = (key: string): string => this.translate.instant(`operations.payouts.${key}`);
    return [
      { label: t('ownerNet'), value: cur.net, color: SPLIT_COLORS.net },
      { label: t('platformCommission'), value: cur.commission, color: SPLIT_COLORS.commission },
      { label: t('fees'), value: cur.paymentFees, color: SPLIT_COLORS.fees },
    ];
  });

  /** Gross revenue per statement month, oldest first; the latest month in gold. */
  protected readonly revenueBars = computed<BarItem[]>(() => {
    this.langChange();
    const months = this.statements.hasValue() ? [...this.statements.value()].reverse() : [];
    return months.map((s, i) => ({
      label: this.format.date(s.period, 'monthShort'),
      value: s.gross,
      text: this.format.sar(s.gross),
      gold: i === months.length - 1,
    }));
  });

  protected toggleUnsettled(): void {
    this.unsettledOnly.update((on) => !on);
    this.earningsPage.set(1);
  }

  protected download(statement: Statement): void {
    this.downloading.run(this.api.statementCsv(statement.id), (blob) => saveBlob(blob, `rawaaf-statement-${statement.number}.csv`));
  }

  protected onBankSaved(account: BankAccount): void {
    this.editingBank.set(false);
    this.bank.set(account);
  }
}
