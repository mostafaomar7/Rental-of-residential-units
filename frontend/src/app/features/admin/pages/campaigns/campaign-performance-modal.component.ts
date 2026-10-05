import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Campaign } from '@api/dto';
import { AdminBusinessApi } from '@api/endpoints/admin-business.api';
import { FormatService } from '@core/services/format.service';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { BarChartComponent, BarItem } from '@shared/ui/charts/bar-chart.component';
import { LineChartComponent } from '@shared/ui/charts/line-chart.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { StatTileComponent } from '@shared/ui/stat-tile/stat-tile.component';
import { ResourceStateComponent } from '../../components/resource-state.component';

/** Funnel and daily results of one campaign. */
@Component({
  selector: 'app-campaign-performance-modal',
  imports: [TranslatePipe, FORMAT_PIPES, ModalComponent, StatTileComponent, LineChartComponent, BarChartComponent, ResourceStateComponent],
  template: `
    <app-modal size="xl" [title]="'admin.campaigns.performance.title' | translate: { name: campaign().name }" (closed)="closed.emit()">
      <app-resource-state [resource]="performance" />
      @if (performance.hasValue()) {
        @let t = performance.value().totals;
        <div class="grid g4">
          <app-stat-tile icon="eye" [value]="t.impressions | num" [label]="'admin.campaigns.impressions' | translate" />
          <app-stat-tile icon="mouse-pointer-click" [value]="t.visits | num" [label]="'admin.campaigns.visits' | translate" [sub]="'admin.campaigns.ctr' | translate: { value: pct(t.clickThroughRate) }" />
          <app-stat-tile
            icon="calendar-check"
            tone="gold"
            [value]="t.bookings | num"
            [label]="'admin.campaigns.bookings' | translate"
            [sub]="'admin.campaigns.conversion' | translate: { value: pct(t.conversionRate) }"
          />
          <app-stat-tile
            icon="trending-up"
            tone="green"
            [value]="t.roas == null ? '—' : (t.roas | num) + 'x'"
            [label]="'admin.campaigns.roas' | translate"
            [sub]="'admin.campaigns.revenue' | translate: { amount: (t.revenue | sar) }"
          />
          <app-stat-tile icon="banknote" [value]="t.spend | sar" [label]="'admin.campaigns.spend' | translate" [sub]="'admin.campaigns.budgetUsed' | translate: { value: pct(t.budgetUsedPercent) }" />
          <app-stat-tile
            icon="receipt"
            tone="black"
            [value]="t.costPerBooking == null ? '—' : (t.costPerBooking | sar)"
            [label]="'admin.campaigns.costPerBookingLabel' | translate"
          />
          <app-stat-tile icon="calendar-x" tone="red" [value]="t.cancelledBookings | num" [label]="'admin.campaigns.cancelled' | translate" />
          <app-stat-tile icon="badge-percent" [value]="t.promoDiscount | sar" [label]="'admin.campaigns.promoDiscount' | translate" />
        </div>

        <div class="grid g2 mt-24 gap-24">
          <div class="card card-p">
            <div class="card-h">
              <h3>{{ 'admin.campaigns.performance.funnel' | translate }}</h3>
            </div>
            <div class="stack-sm">
              @for (step of funnel(); track step.key) {
                <div class="hbar">
                  <span class="xs b">{{ 'admin.campaigns.performance.steps.' + step.key | translate }}</span>
                  <div class="bar"><div [style.width.%]="step.pct"></div></div>
                  <span class="xs b">{{ step.value | num }}</span>
                </div>
              }
            </div>
          </div>
          <div class="card card-p">
            <div class="card-h">
              <h3>{{ 'admin.campaigns.performance.dailyBookings' | translate }}</h3>
            </div>
            @if (bookingBars().length) {
              <app-bar-chart [items]="bookingBars()" [height]="160" />
            } @else {
              <p class="small muted">{{ 'admin.campaigns.performance.noData' | translate }}</p>
            }
          </div>
        </div>

        <div class="card card-p mt-24">
          <div class="card-h">
            <h3>{{ 'admin.campaigns.performance.dailyRevenue' | translate }}</h3>
          </div>
          @if (revenue().length) {
            <app-line-chart [values]="revenue()" [labels]="labels()" [formatTip]="formatSar" [label]="'admin.campaigns.performance.dailyRevenue' | translate" />
          } @else {
            <p class="small muted">{{ 'admin.campaigns.performance.noData' | translate }}</p>
          }
        </div>
      }
    </app-modal>
  `,
  styles: `
    .gap-24 {
      gap: 24px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignPerformanceModalComponent {
  private readonly api = inject(AdminBusinessApi);
  private readonly format = inject(FormatService);
  private readonly translate = inject(TranslateService);
  /** Ticks when the language changes, so date labels re-format. */
  private readonly langChange = toSignal(this.translate.onLangChange);

  readonly campaign = input.required<Campaign>();
  readonly closed = output<void>();

  protected readonly performance = rxResource({ params: () => this.campaign().id, stream: ({ params }) => this.api.campaignPerformance(params) });

  private readonly daily = computed(() => (this.performance.hasValue() ? this.performance.value().daily : []));

  protected readonly labels = computed(() => {
    this.langChange();
    return this.daily().map((d) => this.format.date(d.date, 'short'));
  });
  protected readonly revenue = computed(() => this.daily().map((d) => d.revenue));
  protected readonly bookingBars = computed<BarItem[]>(() => {
    const labels = this.labels();
    return this.daily().map((d, i) => ({ label: labels[i], value: d.bookings, text: this.format.num(d.bookings) }));
  });

  /** Impressions → visits → bookings, each as a share of impressions. */
  protected readonly funnel = computed(() => {
    if (!this.performance.hasValue()) return [];
    const t = this.performance.value().totals;
    const top = t.impressions || 1;
    return (['impressions', 'visits', 'bookings'] as const).map((key) => ({ key, value: t[key], pct: Math.min(100, (t[key] / top) * 100) }));
  });

  protected readonly formatSar = (v: number): string => this.format.sar(Math.round(v));

  /** Rates are percentages (0–100); `—` when not computable. */
  protected pct(value: number | null): string {
    return value == null ? '—' : this.format.num(value);
  }
}
