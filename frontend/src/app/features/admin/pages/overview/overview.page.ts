import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { KpiDashboard, KpiValues } from '@api/dto';
import { AdminBusinessApi } from '@api/endpoints/admin-business.api';
import { AdminConfigApi } from '@api/endpoints/admin-config.api';
import { FormatService } from '@core/services/format.service';
import { ToastService } from '@core/services/toast.service';
import { saveBlob } from '@core/utils/download.utils';
import { addDays, today } from '@core/utils/date.utils';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { BarChartComponent, BarItem } from '@shared/ui/charts/bar-chart.component';
import { DonutChartComponent, DonutPart } from '@shared/ui/charts/donut-chart.component';
import { LineChartComponent } from '@shared/ui/charts/line-chart.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatTileComponent } from '@shared/ui/stat-tile/stat-tile.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { AdminQueuesService } from '../../admin-queues.service';
import { QueueTileComponent } from '../../components/queue-tile.component';
import { ResourceStateComponent } from '../../components/resource-state.component';

/** Reporting periods offered, in days ending today. */
const PERIODS = [7, 30, 90, 365] as const;
type PeriodDays = (typeof PERIODS)[number];

/** Cities shown separately in the donut; the rest are grouped as "other". */
const TOP_CITIES = 4;
const CITY_COLORS = ['#0A1931', '#C9A86A', '#1d3a6b', '#8B6F47', '#d9d2c2'];

const DATE_PERIOD = /^\d{4}-\d{2}(-\d{2})?$/;

interface Trend {
  text: string;
  down: boolean;
}

/** `/admin` — platform KPIs for a period vs. the previous one, work queues, operations and integrations health. */
@Component({
  selector: 'app-overview-page',
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    FORMAT_PIPES,
    PageHeaderComponent,
    StatTileComponent,
    StatusPillComponent,
    QueueTileComponent,
    LineChartComponent,
    BarChartComponent,
    DonutChartComponent,
    IconComponent,
    ResourceStateComponent,
  ],
  templateUrl: './overview.page.html',
  styles: `
    .gap-24 {
      gap: 24px;
    }
    .legend-navy {
      background: #0a1931;
    }
    .period {
      width: auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewPage {
  private readonly businessApi = inject(AdminBusinessApi);
  private readonly configApi = inject(AdminConfigApi);
  private readonly toast = inject(ToastService);
  private readonly format = inject(FormatService);
  private readonly translate = inject(TranslateService);
  protected readonly queues = inject(AdminQueuesService);
  /** Shoots awaiting QA plus owner requests awaiting a photographer (`null` until both load). */
  protected readonly photoQueue = computed(() => {
    const { photoShoots, shootRequests } = this.queues.counts();
    return photoShoots === null || shootRequests === null ? null : photoShoots + shootRequests;
  });
  /** Ticks once translations for the active language are loaded, so label arrays re-translate. */
  private readonly langChange = toSignal(this.translate.onLangChange);

  protected readonly periods = PERIODS;
  protected readonly periodDays = signal<PeriodDays>(30);
  protected readonly exporting = signal(false);

  private readonly range = computed(() => {
    const to = today();
    return { from: addDays(to, 1 - this.periodDays()), to };
  });

  protected readonly kpis = rxResource({ params: this.range, stream: ({ params }) => this.businessApi.kpis(params) });
  protected readonly byProperty = rxResource({ params: this.range, stream: ({ params }) => this.businessApi.kpisByProperty(params) });
  protected readonly integrations = rxResource({ stream: () => this.configApi.integrations() });

  protected readonly dashboard = computed<KpiDashboard | null>(() => (this.kpis.hasValue() ? this.kpis.value() : null));

  protected readonly trendLabels = computed(() => {
    this.langChange();
    const d = this.dashboard();
    if (!d) return [];
    const style = d.trend.granularity === 'month' ? 'monthShort' : 'short';
    return d.trend.points.map((p) => (DATE_PERIOD.test(p.period) ? this.format.date(p.period, style) : p.period));
  });

  protected readonly revenueValues = computed(() => this.dashboard()?.trend.points.map((p) => p.revenue) ?? []);
  protected readonly formatSar = (v: number): string => this.format.sar(Math.round(v));

  protected readonly bookingBars = computed<BarItem[]>(() => {
    const points = this.dashboard()?.trend.points ?? [];
    const labels = this.trendLabels();
    const peak = Math.max(0, ...points.map((p) => p.bookings));
    return points.map((p, i) => ({ label: labels[i], value: p.bookings, text: this.format.num(p.bookings), gold: p.bookings === peak && peak > 0 }));
  });

  /** Bookings of the period per city (from the per-property KPIs). */
  protected readonly cityParts = computed<DonutPart[]>(() => {
    this.langChange();
    if (!this.byProperty.hasValue()) return [];
    const totals = new Map<string, number>();
    for (const row of this.byProperty.value().items) {
      const city = row.property.city?.nameAr ?? this.translate.instant('admin.overview.noCity');
      totals.set(city, (totals.get(city) ?? 0) + row.bookings);
    }
    const sorted = [...totals.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, TOP_CITIES).map(([label, value], i) => ({ label, value, color: CITY_COLORS[i] }));
    const rest = sorted.slice(TOP_CITIES).reduce((sum, [, v]) => sum + v, 0);
    return rest ? [...top, { label: this.translate.instant('admin.overview.otherCities'), value: rest, color: CITY_COLORS[TOP_CITIES] }] : top;
  });

  /** `▲ 6%` / `▼ 3%` vs. the previous period; `invert` when a rise is bad news (cancellations). */
  protected trend(key: keyof KpiValues, invert = false): Trend | null {
    const change = this.dashboard()?.changePercent[key];
    if (change == null) return null;
    const down = change < 0;
    return { text: `${down ? '▼' : '▲'} ${this.format.num(Math.abs(change))}%`, down: invert ? !down : down };
  }

  /** Percentage for display (rates are 0–100), `—` when not computable. */
  protected pct(value: number | null | undefined): string {
    return value == null ? '—' : `${this.format.num(value)}%`;
  }

  protected exportCsv(): void {
    const range = this.range();
    this.exporting.set(true);
    this.businessApi.kpisExport(range).subscribe({
      next: (blob) => {
        saveBlob(blob, `rawaaf-kpis-${range.from}-${range.to}.csv`);
        this.exporting.set(false);
      },
      error: (err) => {
        this.exporting.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
