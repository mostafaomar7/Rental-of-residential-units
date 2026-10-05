import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiDate, Uuid } from '@api/api.types';
import { DecideResult, PriceRecommendation, RecommendationDecision } from '@api/dto';
import { HostInsightsApi } from '@api/endpoints/host-insights.api';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { FormatService } from '@core/services/format.service';
import { ToastService } from '@core/services/toast.service';
import { addDays, today } from '@core/utils/date.utils';
import { AppDatePipe, NumPipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatTileComponent } from '@shared/ui/stat-tile/stat-tile.component';
import { LoadErrorComponent, LoadingComponent } from '../../components/async-state.component';
import { WEEKDAY_SAMPLE, leadingBlanks } from '../../services/calendar-grid';
import { Mutation } from '../../services/mutation';
import { OperatorBadgesService } from '../../services/operator-badges.service';
import { OperatorPortfolioService } from '../../services/operator-portfolio.service';
import { PriceDayDialogComponent } from './price-day-dialog.component';
import { PricingSettingsCardComponent } from './pricing-settings-card.component';
import { ReasonPillComponent } from './reason-pill.component';

/** Days shown on the heat map (the engine plans this far ahead). */
const HORIZON_DAYS = 35;

/** Heat level 0–4 of a price change (0 = decrease, 4 = +25% and above). */
function heatLevel(changePercent: number): number {
  if (changePercent < -3) return 0;
  if (changePercent < 5) return 1;
  if (changePercent < 15) return 2;
  if (changePercent < 25) return 3;
  return 4;
}

interface HeatCell {
  date: ApiDate;
  day: number;
  /** Show the month name (first cell and the 1st of a month). */
  showMonth: boolean;
  heat: number;
  rec?: PriceRecommendation;
}

/** `/operator/pricing?property=` — smart-pricing heat map, settings and approvals per unit (SRS §PRC). */
@Component({
  selector: 'app-pricing-page',
  imports: [
    TranslatePipe,
    AppDatePipe,
    NumPipe,
    SarPipe,
    LocalizePipe,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    StatTileComponent,
    LoadingComponent,
    LoadErrorComponent,
    PriceDayDialogComponent,
    PricingSettingsCardComponent,
    ReasonPillComponent,
  ],
  templateUrl: './pricing.page.html',
  styles: `
    .layout {
      gap: 24px;
      align-items: start;
    }
    .reasons {
      gap: 4px;
    }
    .property-select {
      width: auto;
      min-width: 240px;
    }
    .lg-down {
      background: #eef4fb;
      border: 1px solid #cfe;
    }
    .lg-2 {
      background: #f8f0e0;
    }
    .lg-3 {
      background: #f0ddb6;
    }
    .lg-4 {
      background: #e3c48a;
    }
    .lg-approved {
      background: #fff;
      box-shadow: inset 0 0 0 2px #10b981;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingPage {
  private readonly insightsApi = inject(HostInsightsApi);
  private readonly propertiesApi = inject(HostPropertiesApi);
  private readonly toast = inject(ToastService);
  private readonly format = inject(FormatService);
  private readonly badges = inject(OperatorBadgesService);
  protected readonly portfolio = inject(OperatorPortfolioService);

  /** `?property=` deep link from a property profile. */
  readonly property = input<string>();

  protected readonly weekdays = WEEKDAY_SAMPLE;
  protected readonly start = today();
  protected readonly blanks = Array.from({ length: leadingBlanks(this.start) });

  protected readonly propertyId = linkedSignal<Uuid | null>(() => this.property() || this.portfolio.properties()[0]?.id || null);
  /** The selected property in full (list rows carry no unit prices). */
  private readonly detail = rxResource({
    params: () => this.propertyId() ?? undefined,
    stream: ({ params }) => this.propertiesApi.get(params),
  });
  protected readonly units = computed(() => (this.detail.hasValue() ? this.detail.value().commercial.units : []));
  protected readonly unitId = linkedSignal<Uuid | null>(() => this.units()[0]?.id ?? null);
  protected readonly unit = computed(() => this.units().find((u) => u.id === this.unitId()));

  protected readonly openRec = signal<PriceRecommendation | null>(null);
  /** Pending suggestions ticked for a bulk decision. */
  protected readonly picked = signal<ReadonlySet<Uuid>>(new Set());
  protected readonly deciding = new Mutation();
  protected readonly regenerating = new Mutation();

  protected readonly recommendations = rxResource({
    params: () => {
      const unitId = this.unitId();
      return unitId ? { unitId, from: this.start, to: addDays(this.start, HORIZON_DAYS - 1), limit: 100 } : undefined;
    },
    stream: ({ params }) => this.insightsApi.recommendations(params),
  });

  protected readonly settings = rxResource({
    params: () => this.propertyId() ?? undefined,
    stream: ({ params }) => this.propertiesApi.pricingSettings(params),
  });

  private readonly all = computed(() => (this.recommendations.hasValue() ? this.recommendations.value().items : []));
  protected readonly pending = computed(() => this.all().filter((r) => r.status === 'PENDING').sort((a, b) => a.date.localeCompare(b.date)));
  protected readonly summary = computed(() => ({
    up: this.pending().filter((r) => r.direction === 'UP').length,
    down: this.pending().filter((r) => r.direction === 'DOWN').length,
    /** Revenue difference if every pending suggestion is approved. */
    impact: this.pending().reduce((sum, r) => sum + r.recommendedPrice - r.currentPrice, 0),
  }));

  protected readonly cells = computed<HeatCell[]>(() => {
    const byDate = new Map(this.all().map((r) => [r.date, r]));
    return Array.from({ length: HORIZON_DAYS }, (_, i) => {
      const date = addDays(this.start, i);
      const rec = byDate.get(date);
      return { date, day: Number(date.slice(8)), showMonth: i === 0 || date.endsWith('-01'), heat: heatLevel(rec?.changePercent ?? 0), rec };
    });
  });

  protected readonly allPicked = computed(() => this.pending().length > 0 && this.pending().every((r) => this.picked().has(r.id)));

  protected formatSar(value: number): string {
    return this.format.sar(value);
  }

  protected selectProperty(id: string): void {
    this.propertyId.set(id || null);
    this.picked.set(new Set());
  }

  protected selectUnit(id: Uuid): void {
    this.unitId.set(id);
    this.picked.set(new Set());
  }

  protected togglePick(id: Uuid): void {
    this.picked.update((ids) => {
      const next = new Set(ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected toggleAll(): void {
    this.picked.set(this.allPicked() ? new Set() : new Set(this.pending().map((r) => r.id)));
  }

  protected decideOne(decision: RecommendationDecision): void {
    this.decide([decision]);
  }

  /** Approves or rejects the ticked suggestions (all pending ones when none is ticked). */
  protected decideBulk(action: 'APPROVE' | 'REJECT'): void {
    const ids = this.picked().size ? [...this.picked()] : this.pending().map((r) => r.id);
    if (!ids.length) {
      this.toast.show('operator.pricing.nonePending');
      return;
    }
    this.decide(ids.map((id) => ({ id, action })));
  }

  protected regenerate(): void {
    const propertyId = this.propertyId();
    if (!propertyId) return;
    this.regenerating.run(this.propertiesApi.regenerateRecommendations(propertyId), (r) => {
      this.toast.success('operator.pricing.regenerated', { created: r.created, updated: r.updated, applied: r.applied });
      this.afterChange();
    });
  }

  protected afterChange(): void {
    this.openRec.set(null);
    this.picked.set(new Set());
    this.recommendations.reload();
    this.badges.refresh();
  }

  private decide(items: RecommendationDecision[]): void {
    this.deciding.run(this.insightsApi.decide(items), (result) => {
      this.reportDecision(result);
      this.afterChange();
    });
  }

  private reportDecision(result: DecideResult): void {
    if (result.applied) this.toast.success('operator.pricing.applied', { count: result.applied });
    if (result.rejected) this.toast.show('operator.pricing.rejected', 'info', { count: result.rejected });
    if (result.skipped.length) this.toast.error('operator.pricing.skipped', { count: result.skipped.length });
  }
}
