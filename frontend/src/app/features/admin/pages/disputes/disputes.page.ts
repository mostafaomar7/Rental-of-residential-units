import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, forkJoin, map, of } from 'rxjs';
import { DamageCase, DamageStatus } from '@api/dto';
import { AdminPlatformApi } from '@api/endpoints/admin-platform.api';
import { AuthSrcDirective } from '@shared/directives/auth-src.directive';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatTileComponent, StatTone } from '@shared/ui/stat-tile/stat-tile.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { TabItem, TabsComponent } from '@shared/ui/tabs/tabs.component';
import { AdminQueuesService } from '../../admin-queues.service';
import { DamageReviewModalComponent } from '../../components/damage-review-modal.component';
import { PagerComponent } from '../../components/pager.component';
import { ResourceStateComponent } from '../../components/resource-state.component';

/** Statuses counted in the summary tiles (cases waiting for the admin). */
const SUMMARY: readonly { status: DamageStatus; icon: string; tone: StatTone }[] = [
  { status: 'OPENED', icon: 'hourglass', tone: 'gold' },
  { status: 'UNDER_REVIEW', icon: 'search-check', tone: '' },
  { status: 'DISPUTED', icon: 'scale', tone: 'red' },
  { status: 'APPROVED', icon: 'check-circle-2', tone: 'green' },
];

const STATUSES: readonly DamageStatus[] = ['OPENED', 'UNDER_REVIEW', 'GUEST_NOTIFIED', 'DISPUTED', 'APPROVED', 'REJECTED', 'SETTLED', 'CLOSED'];
const FILTERS: readonly TabItem[] = [{ id: 'ALL', label: 'admin.common.all' }, ...STATUSES.map((s) => ({ id: s, label: `status.damage.${s}` }))];

const PAGE_SIZE = 20;
/** Thumbnails shown per case in the table. */
const THUMBS = 2;

/** `/admin/disputes` — neutral review of damage cases between guests and hosts (SRS §POL). */
@Component({
  selector: 'app-disputes-page',
  imports: [
    TranslatePipe,
    FORMAT_PIPES,
    LocalizePipe,
    AuthSrcDirective,
    PageHeaderComponent,
    StatTileComponent,
    StatusPillComponent,
    TabsComponent,
    EmptyStateComponent,
    PagerComponent,
    ResourceStateComponent,
    DamageReviewModalComponent,
  ],
  template: `
    <app-page-header [title]="'admin.disputes.title' | translate" [subtitle]="'admin.disputes.subtitle' | translate" />

    <div class="grid g4 mb-16">
      @for (s of summary(); track s.status) {
        <app-stat-tile [icon]="s.icon" [tone]="s.tone" [value]="s.count ?? '—'" [label]="'status.damage.' + s.status | translate" />
      }
    </div>

    <div class="mb-16"><app-tabs [items]="filters" [(active)]="status" /></div>

    <div class="card card-p">
      <app-resource-state [resource]="cases" />
      @if (cases.hasValue()) {
        @let page = cases.value();
        @if (page.items.length) {
          <div class="tbl-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>{{ 'admin.disputes.cols.case' | translate }}</th>
                  <th>{{ 'admin.disputes.cols.unit' | translate }}</th>
                  <th>{{ 'admin.disputes.cols.guest' | translate }}</th>
                  <th>{{ 'admin.disputes.cols.amount' | translate }}</th>
                  <th>{{ 'admin.disputes.cols.evidence' | translate }}</th>
                  <th>{{ 'admin.disputes.cols.status' | translate }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (d of page.items; track d.id) {
                  <tr>
                    <td>
                      <div class="b ltr">{{ d.number }}</div>
                      <div class="xs muted">{{ d.createdAt | appDate: 'medium' }}</div>
                    </td>
                    <td class="small">
                      {{ d.property | loc }}
                      <div class="xs muted"><span class="ltr">{{ d.booking.number }}</span></div>
                    </td>
                    <td class="small">{{ d.booking.guestName }}</td>
                    <td class="nowrap">
                      <div class="b">{{ d.amountClaimed | sar }}</div>
                      @if (d.amountApproved != null) {
                        <div class="xs green">{{ 'admin.disputes.approvedShort' | translate: { amount: (d.amountApproved | sar) } }}</div>
                      }
                    </td>
                    <td>
                      <div class="row thumbs">
                        @for (p of d.photos.slice(0, thumbs); track p.id) {
                          <img class="thumb" [authSrc]="p.thumbUrl" alt="" />
                        }
                      </div>
                    </td>
                    <td><app-status-pill domain="damage" [code]="d.status" /></td>
                    <td>
                      <button type="button" class="btn btn-primary btn-xs" (click)="reviewing.set(d)">{{ 'admin.disputes.review' | translate }}</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state icon="scale" [title]="'admin.disputes.empty' | translate" />
        }
        <app-pager [meta]="page.meta" (pageChange)="currentPage.set($event)" />
      }
    </div>

    @if (reviewing(); as d) {
      <app-damage-review-modal [damage]="d" (changed)="onChanged()" (closed)="reviewing.set(null)" />
    }
  `,
  styles: `
    .thumbs {
      gap: 4px;
    }
    .thumb {
      width: 36px;
      height: 36px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisputesPage {
  private readonly api = inject(AdminPlatformApi);
  private readonly queues = inject(AdminQueuesService);

  protected readonly filters = FILTERS;
  protected readonly thumbs = THUMBS;
  protected readonly status = signal<string>('ALL');
  protected readonly currentPage = linkedSignal({ source: this.status, computation: () => 1 });
  protected readonly reviewing = signal<DamageCase | null>(null);

  protected readonly cases = rxResource({
    params: () => ({ status: this.status() === 'ALL' ? undefined : this.status(), page: this.currentPage(), limit: PAGE_SIZE }),
    stream: ({ params }) => this.api.damageCases(params),
  });

  /** One-item pages read for their `meta.total` only. */
  private readonly counts = rxResource({
    stream: () =>
      forkJoin(
        SUMMARY.map((s) =>
          this.api.damageCases({ status: s.status, limit: 1 }).pipe(
            map((p) => p.meta.total),
            catchError(() => of(null)),
          ),
        ),
      ),
  });

  protected readonly summary = computed(() => {
    const counts = this.counts.hasValue() ? this.counts.value() : [];
    return SUMMARY.map((s, i) => ({ ...s, count: counts[i] ?? null }));
  });

  protected onChanged(): void {
    this.cases.reload();
    this.counts.reload();
    this.queues.refresh();
  }
}
