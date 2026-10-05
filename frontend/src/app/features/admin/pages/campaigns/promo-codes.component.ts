import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { PromoCode } from '@api/dto';
import { AdminBusinessApi } from '@api/endpoints/admin-business.api';
import { ToastService } from '@core/services/toast.service';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ToggleComponent } from '@shared/ui/toggle/toggle.component';
import { PagerComponent } from '../../components/pager.component';
import { PromoCodeDraft, PromoCodeFormModalComponent } from '../../components/promo-code-form-modal.component';
import { ResourceStateComponent } from '../../components/resource-state.component';
import { PendingToggles } from '../../pending-toggles';

type ActiveFilter = '' | 'true' | 'false';
const PAGE_SIZE = 20;

/** Promo codes: search, activate / deactivate, create and edit, usage figures. */
@Component({
  selector: 'app-promo-codes',
  imports: [FormsModule, TranslatePipe, FORMAT_PIPES, EmptyStateComponent, IconComponent, ToggleComponent, PagerComponent, ResourceStateComponent, PromoCodeFormModalComponent],
  template: `
    <div class="row between wrap mb-16">
      <div class="row wrap">
        <div class="search search-box">
          <app-icon name="search" />
          <input
            type="search"
            [placeholder]="'admin.promo.searchPlaceholder' | translate"
            [attr.aria-label]="'common.search' | translate"
            [ngModel]="search()"
            (change)="search.set($any($event.target).value.trim())"
          />
        </div>
        <select class="select filter" [attr.aria-label]="'admin.promo.activeFilter' | translate" [(ngModel)]="active">
          <option value="">{{ 'admin.common.all' | translate }}</option>
          <option value="true">{{ 'admin.promo.active' | translate }}</option>
          <option value="false">{{ 'admin.promo.inactive' | translate }}</option>
        </select>
      </div>
      <button type="button" class="btn btn-primary" (click)="editing.set(null)"><app-icon name="plus" size="sm" />{{ 'admin.promo.new' | translate }}</button>
    </div>

    <div class="card card-p">
      <app-resource-state [resource]="codes" />
      @if (codes.hasValue()) {
        @let page = codes.value();
        @if (page.items.length) {
          <div class="tbl-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>{{ 'admin.promo.cols.code' | translate }}</th>
                  <th>{{ 'admin.promo.cols.discount' | translate }}</th>
                  <th>{{ 'admin.promo.cols.validity' | translate }}</th>
                  <th>{{ 'admin.promo.cols.usage' | translate }}</th>
                  <th>{{ 'admin.promo.cols.fundedBy' | translate }}</th>
                  <th>{{ 'admin.promo.cols.active' | translate }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (p of page.items; track p.id) {
                  <tr>
                    <td>
                      <span class="kbd">{{ p.code }}</span>
                      @if (p.descriptionAr) {
                        <div class="xs muted mt-4" dir="auto">{{ p.descriptionAr }}</div>
                      }
                      @if (p.campaign) {
                        <div class="xs muted">{{ 'admin.promo.campaign' | translate: { name: p.campaign.name } }}</div>
                      }
                    </td>
                    <td class="nowrap">
                      <div class="b">{{ p.discountType === 'PERCENT' ? p.value + '%' : (p.value | sar) }}</div>
                      @if (p.maxDiscount != null) {
                        <div class="xs muted">{{ 'admin.promo.upTo' | translate: { amount: (p.maxDiscount | sar) } }}</div>
                      }
                      @if (p.firstBookingOnly) {
                        <div class="xs muted">{{ 'admin.promo.firstBookingOnly' | translate }}</div>
                      }
                    </td>
                    <td class="small nowrap">
                      {{ p.startsAt | appDate: 'medium' }}<br /><span class="muted">{{ p.endsAt | appDate: 'medium' }}</span>
                    </td>
                    <td class="small">
                      {{ 'admin.promo.used' | translate: { used: (p.usage?.redeemed ?? 0), limit: p.usageLimit ?? '∞' } }}
                      @if (p.usage) {
                        <div class="xs muted">{{ 'admin.promo.discountGiven' | translate: { amount: (p.usage.discountGiven | sar) } }}</div>
                      }
                    </td>
                    <td class="small">{{ 'admin.promo.funders.' + p.fundedBy | translate }}</td>
                    <td>
                      <app-toggle [checked]="toggles.value(p.id, p.isActive)" [disabled]="toggles.isPending(p.id)" [label]="'admin.promo.cols.active' | translate" (checkedChange)="setActive(p, $event)" />
                    </td>
                    <td>
                      <button type="button" class="btn btn-ghost btn-icon btn-xs" [attr.aria-label]="'admin.promo.edit' | translate" (click)="editing.set(p)">
                        <app-icon name="pencil" size="sm" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state icon="badge-percent" [title]="'admin.promo.empty' | translate" />
        }
        <app-pager [meta]="page.meta" (pageChange)="currentPage.set($event)" />
      }
    </div>

    @if (editing() !== undefined) {
      <app-promo-code-form-modal [promo]="editing() ?? null" [busy]="saving()" (saved)="save($event)" (closed)="editing.set(undefined)" />
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .search-box {
      max-width: 260px;
    }
    .filter {
      width: auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromoCodesComponent {
  private readonly api = inject(AdminBusinessApi);
  private readonly toast = inject(ToastService);

  protected readonly search = signal('');
  protected readonly active = signal<ActiveFilter>('');
  protected readonly currentPage = linkedSignal({ source: () => [this.search(), this.active()], computation: () => 1 });
  /** `undefined` = closed, `null` = creating, otherwise the code being edited. */
  protected readonly editing = signal<PromoCode | null | undefined>(undefined);
  protected readonly saving = signal(false);
  protected readonly toggles = new PendingToggles();

  protected readonly codes = rxResource({
    params: () => ({
      search: this.search() || undefined,
      active: this.active() === '' ? undefined : this.active() === 'true',
      page: this.currentPage(),
      limit: PAGE_SIZE,
    }),
    stream: ({ params }) => this.api.promoCodes(params),
  });

  protected save(draft: PromoCodeDraft): void {
    const editing = this.editing();
    const request = editing ? this.api.updatePromoCode(editing.id, draft) : this.api.createPromoCode({ ...draft, code: draft.code ?? '' });
    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(undefined);
        this.toast.success(editing ? 'admin.promo.updated' : 'admin.promo.created');
        this.codes.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.apiError(err);
      },
    });
  }

  protected setActive(promo: PromoCode, isActive: boolean): void {
    this.toggles.start(promo.id, isActive);
    this.api.updatePromoCode(promo.id, { isActive }).subscribe({
      next: (updated) => {
        this.codes.update((page) => page && { ...page, items: page.items.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)) });
        this.toggles.done(promo.id);
        this.toast.success(isActive ? 'admin.promo.activated' : 'admin.promo.deactivated', { code: promo.code });
      },
      error: (err) => {
        this.toggles.failed(promo.id, promo.isActive);
        this.toast.apiError(err);
      },
    });
  }
}
