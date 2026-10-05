import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { KpiDashboard, KpiQuery, KpiValues } from '@api/dto';
import { HostInsightsApi } from '@api/endpoints/host-insights.api';
import { FormatService } from '@core/services/format.service';
import { saveBlob } from '@core/utils/download.utils';
import { today } from '@core/utils/date.utils';
import { AppDatePipe, NumPipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { LineChartComponent } from '@shared/ui/charts/line-chart.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { KvComponent } from '@shared/ui/kv/kv.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatTileComponent } from '@shared/ui/stat-tile/stat-tile.component';
import { TabItem, TabsComponent } from '@shared/ui/tabs/tabs.component';
import { LoadErrorComponent, LoadingComponent } from '../../components/async-state.component';
import { periodStart } from '../../services/date-ranges';
import { Mutation } from '../../services/mutation';
import { OperatorBadgesService } from '../../services/operator-badges.service';
import { OperatorSessionService } from '../../services/operator-session.service';
import { DashAlert, buildAlerts } from './dashboard-alerts';

type Period = '7' | '30' | '90' | '365';

/** KPI tile trend: `▲ 6%` / `▼ 3%` against the previous period of the same length. */
interface Trend {
  text: string;
  down: boolean;
}

/** `/operator` — portfolio KPIs vs. the previous period, revenue trend, operations and per-property figures. */
@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    TranslatePipe,
    AppDatePipe,
    NumPipe,
    SarPipe,
    LocalizePipe,
    IconComponent,
    KvComponent,
    PageHeaderComponent,
    StatTileComponent,
    TabsComponent,
    LineChartComponent,
    EmptyStateComponent,
    LoadingComponent,
    LoadErrorComponent,
  ],
  templateUrl: './dashboard.page.html',
  styles: `
    .gap-24 {
      gap: 24px;
    }
    .lg-navy {
      background: var(--navy);
    }
    .occ-bar {
      width: 60px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly api = inject(HostInsightsApi);
  private readonly format = inject(FormatService);
  private readonly badges = inject(OperatorBadgesService);
  protected readonly session = inject(OperatorSessionService);

  protected readonly today = today();
  protected readonly period = signal<Period>('30');
  protected readonly periods: TabItem<Period>[] = [
    { id: '7', label: 'operator.dashboard.periods.7' },
    { id: '30', label: 'operator.dashboard.periods.30' },
    { id: '90', label: 'operator.dashboard.periods.90' },
    { id: '365', label: 'operator.dashboard.periods.365' },
  ];
  protected readonly exporting = new Mutation();

  private readonly query = computed<KpiQuery>(() => ({ from: periodStart(Number(this.period())), to: this.today }));

  protected readonly kpis = rxResource({ params: () => this.query(), stream: ({ params }) => this.api.kpis(params) });
  protected readonly byProperty = rxResource({ params: () => this.query(), stream: ({ params }) => this.api.kpisByProperty(params) });

  /** Revenue per day / week / month of the period. */
  protected readonly chart = computed(() => {
    if (!this.kpis.hasValue()) return null;
    const { granularity, points } = this.kpis.value().trend;
    const style = granularity === 'month' ? 'monthShort' : 'short';
    return {
      granularity,
      values: points.map((p) => p.revenue),
      // Periods are `YYYY-MM-DD` (day, week start) or `YYYY-MM`; anything else is shown as sent.
      labels: points.map((p) => (/^\d{4}-\d{2}(-\d{2})?$/.test(p.period) ? this.format.date(p.period, style) : p.period)),
    };
  });

  protected readonly alerts = computed<DashAlert[]>(() =>
    buildAlerts(this.badges.lockAlerts(), this.badges.openIncidents(), this.badges.pendingPricing()),
  );

  protected readonly formatCompact = (v: number): string => this.format.compact(v);
  protected readonly formatSar = (v: number): string => this.format.sar(v);

  /** Rates come as percentages; `null` when there is nothing to measure yet. */
  protected rate(value: number | null): string {
    return value === null ? '—' : `${this.format.num(value)}%`;
  }

  protected trend(k: KpiDashboard, key: keyof KpiValues): Trend | null {
    const change = k.changePercent[key];
    if (change === null || change === undefined) return null;
    return { text: `${change < 0 ? '▼' : '▲'} ${this.format.num(Math.abs(change))}%`, down: change < 0 };
  }

  protected setPeriod(id: string): void {
    this.period.set(id as Period);
  }

  protected exportCsv(): void {
    const { from, to } = this.query();
    this.exporting.run(this.api.kpisExport(this.query()), (blob) => saveBlob(blob, `rawaaf-kpis-${from}-${to}.csv`));
  }
}
