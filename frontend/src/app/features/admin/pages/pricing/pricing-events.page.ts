import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { Uuid } from '@api/api.types';
import { PricingEvent, PricingEventBody, PricingEventType } from '@api/dto';
import { AdminConfigApi } from '@api/endpoints/admin-config.api';
import { CatalogService } from '@core/services/catalog.service';
import { ConfirmService } from '@core/services/confirm.service';
import { LangService } from '@core/services/lang.service';
import { ToastService } from '@core/services/toast.service';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { localize } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PagerComponent } from '../../components/pager.component';
import { PricingEventFormModalComponent } from '../../components/pricing-event-form-modal.component';
import { ResourceStateComponent } from '../../components/resource-state.component';

/** Pill colour per event type (`pill-<tone>`). */
const TYPE_TONES: Record<PricingEventType, string> = { HOLIDAY: 'red', EVENT: 'blue', SEASON: 'gold', SCHOOL_HOLIDAY: 'green', OTHER: 'gray' };
const PAGE_SIZE = 20;

/** `/admin/pricing` — the events & holidays calendar that drives price suggestions for every host (SRS §PRC). */
@Component({
  selector: 'app-pricing-events-page',
  imports: [TranslatePipe, FORMAT_PIPES, PageHeaderComponent, IconComponent, EmptyStateComponent, PagerComponent, ResourceStateComponent, PricingEventFormModalComponent],
  template: `
    <app-page-header [title]="'admin.pricing.title' | translate" [subtitle]="'admin.pricing.subtitle' | translate" />

    <div class="card card-p">
      <div class="card-h">
        <h3>{{ 'admin.pricing.calendar' | translate }}</h3>
        <button type="button" class="btn btn-primary btn-sm" (click)="editing.set(null)"><app-icon name="plus" size="sm" />{{ 'admin.pricing.add' | translate }}</button>
      </div>
      <app-resource-state [resource]="events" />
      @if (events.hasValue()) {
        @let page = events.value();
        @if (page.items.length) {
          <div class="tbl-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>{{ 'admin.pricing.cols.event' | translate }}</th>
                  <th>{{ 'admin.pricing.cols.kind' | translate }}</th>
                  <th>{{ 'admin.pricing.cols.cities' | translate }}</th>
                  <th>{{ 'admin.pricing.cols.period' | translate }}</th>
                  <th>{{ 'admin.pricing.cols.impact' | translate }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (e of page.items; track e.id) {
                  <tr [class.muted]="!e.isActive">
                    <td>
                      <div class="b">{{ eventName(e) }}</div>
                      @if (!e.isActive) {
                        <span class="pill pill-gray">{{ 'admin.pricing.inactive' | translate }}</span>
                      }
                    </td>
                    <td><span class="pill" [class]="'pill-' + typeTones[e.type]">{{ 'domain.api.pricingEventType.' + e.type | translate }}</span></td>
                    <td class="small">
                      @for (id of e.cityIds; track id; let last = $last) {
                        {{ cityName(id) }}{{ last ? '' : ('admin.listSeparator' | translate) }}
                      } @empty {
                        {{ 'admin.pricing.allCities' | translate }}
                      }
                    </td>
                    <td class="small nowrap">
                      {{ e.startDate | appDate }}<br /><span class="muted">{{ e.endDate | appDate }}</span>
                    </td>
                    <td [class]="e.upliftPercent < 0 ? 'trend-down' : 'trend-up'">
                      <span class="ltr">{{ e.upliftPercent > 0 ? '+' : '' }}{{ e.upliftPercent }}%</span>
                    </td>
                    <td class="nowrap">
                      <button type="button" class="btn btn-ghost btn-icon btn-xs" [attr.aria-label]="'admin.pricing.edit' | translate" (click)="editing.set(e)"><app-icon name="pencil" size="sm" /></button>
                      <button type="button" class="btn btn-danger btn-icon btn-xs" [attr.aria-label]="'admin.pricing.delete' | translate" [disabled]="deleting() === e.id" (click)="remove(e)">
                        <app-icon name="trash-2" size="sm" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state icon="calendar-days" [title]="'admin.pricing.empty' | translate" />
        }
        <app-pager [meta]="page.meta" (pageChange)="currentPage.set($event)" />
      }
    </div>

    @if (editing() !== undefined) {
      <app-pricing-event-form-modal [event]="editing() ?? null" [cities]="catalog.cities()" [busy]="saving()" (saved)="save($event)" (closed)="editing.set(undefined)" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingEventsPage {
  private readonly api = inject(AdminConfigApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly lang = inject(LangService);
  protected readonly catalog = inject(CatalogService);

  protected readonly typeTones = TYPE_TONES;
  protected readonly currentPage = signal(1);
  /** `undefined` = closed, `null` = adding, otherwise the event being edited. */
  protected readonly editing = signal<PricingEvent | null | undefined>(undefined);
  protected readonly saving = signal(false);
  protected readonly deleting = signal<Uuid | null>(null);

  protected readonly events = rxResource({
    params: () => ({ page: this.currentPage(), limit: PAGE_SIZE }),
    stream: ({ params }) => this.api.pricingEvents(params),
  });

  private readonly cityById = computed(() => new Map(this.catalog.cities().map((c) => [c.id, c])));

  protected eventName(event: PricingEvent): string {
    return localize({ ...event }, 'name', this.lang.lang());
  }

  /** City name in the active language (the id when the city is no longer in the catalog). */
  protected cityName(id: Uuid): string {
    const city = this.cityById().get(id);
    return city ? localize({ ...city }, 'name', this.lang.lang()) : id;
  }

  protected save(body: PricingEventBody): void {
    const editing = this.editing();
    this.mutate(editing ? this.api.updatePricingEvent(editing.id, body) : this.api.createPricingEvent(body), () => {
      this.editing.set(undefined);
      this.toast.success('admin.pricing.saved');
    });
  }

  protected async remove(event: PricingEvent): Promise<void> {
    const ok = await this.confirm.ask({ title: 'admin.pricing.deleteTitle', message: 'admin.pricing.deleteMessage', messageParams: { name: this.eventName(event) }, okLabel: 'admin.pricing.delete', danger: true });
    if (!ok) return;
    this.deleting.set(event.id);
    this.api.deletePricingEvent(event.id).subscribe({
      next: () => {
        this.deleting.set(null);
        this.toast.show('admin.pricing.deleted');
        this.events.reload();
      },
      error: (err) => {
        this.deleting.set(null);
        this.toast.apiError(err);
      },
    });
  }

  private mutate(request: Observable<PricingEvent>, onDone: () => void): void {
    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        onDone();
        this.events.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
