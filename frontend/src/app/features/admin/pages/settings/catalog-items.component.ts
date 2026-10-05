import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { AdminCancellationPolicy } from '@api/dto';
import { AdminConfigApi, CatalogResource } from '@api/endpoints/admin-config.api';
import { CatalogService } from '@core/services/catalog.service';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ToggleComponent } from '@shared/ui/toggle/toggle.component';
import { ResourceStateComponent } from '../../components/resource-state.component';
import { PendingToggles } from '../../pending-toggles';
import { CatalogDraft, CatalogItemFormModalComponent } from './catalog-item-form-modal.component';

/** Row shape covering types, amenities and policies (policies add description and rules). */
type CatalogRow = Partial<AdminCancellationPolicy> & Pick<AdminCancellationPolicy, 'id' | 'code' | 'nameAr' | 'nameEn' | 'isActive' | 'sortOrder'>;

/**
 * One editable catalog list (property types, amenities or cancellation policies): add, edit,
 * activate / deactivate, delete (refused with `IN_USE` while referenced — deactivate instead).
 */
@Component({
  selector: 'app-catalog-items',
  imports: [TranslatePipe, IconComponent, ToggleComponent, EmptyStateComponent, ResourceStateComponent, CatalogItemFormModalComponent],
  template: `
    <div class="card card-p">
      <div class="card-h">
        <h3>{{ 'admin.catalog.lists.' + resource() | translate }}</h3>
        <button type="button" class="btn btn-primary btn-sm" (click)="editing.set(null)"><app-icon name="plus" size="sm" />{{ 'admin.catalog.add' | translate }}</button>
      </div>
      <app-resource-state [resource]="items" />
      @if (items.hasValue()) {
        @if (items.value().length) {
          <div class="tbl-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>{{ 'admin.catalog.cols.name' | translate }}</th>
                  <th>{{ 'admin.catalog.cols.code' | translate }}</th>
                  @if (resource() === 'cancellation-policies') {
                    <th>{{ 'admin.catalog.cols.rules' | translate }}</th>
                  }
                  <th>{{ 'admin.catalog.cols.order' | translate }}</th>
                  <th>{{ 'admin.catalog.cols.active' | translate }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (item of items.value(); track item.id) {
                  <tr>
                    <td>
                      <div class="b row gap-4">
                        @if (item.icon) {
                          <span class="kbd xs">{{ item.icon }}</span>
                        }
                        {{ item.nameAr }}
                      </div>
                      <div class="xs muted" dir="ltr">{{ item.nameEn }}</div>
                      @if (item.descriptionAr) {
                        <div class="xs muted mt-4" dir="auto">{{ item.descriptionAr }}</div>
                      }
                    </td>
                    <td><span class="kbd">{{ item.code }}</span></td>
                    @if (resource() === 'cancellation-policies') {
                      <td class="small">
                        @for (r of item.rules ?? []; track $index) {
                          <div>{{ 'admin.catalog.rules.summary' | translate: { hours: r.minHoursBefore, pct: r.refundPercent } }}</div>
                        }
                      </td>
                    }
                    <td>{{ item.sortOrder }}</td>
                    <td>
                      <app-toggle [checked]="toggles.value(item.id, item.isActive)" [disabled]="toggles.isPending(item.id)" [label]="'admin.catalog.cols.active' | translate" (checkedChange)="setActive(item, $event)" />
                    </td>
                    <td class="nowrap">
                      <button type="button" class="btn btn-ghost btn-icon btn-xs" [attr.aria-label]="'admin.catalog.edit' | translate" (click)="editing.set(item)"><app-icon name="pencil" size="sm" /></button>
                      <button type="button" class="btn btn-danger btn-icon btn-xs" [attr.aria-label]="'admin.catalog.delete' | translate" [disabled]="busyId() === item.id" (click)="remove(item)">
                        <app-icon name="trash-2" size="sm" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state icon="layers" [title]="'admin.catalog.empty' | translate" />
        }
      }
    </div>

    @if (editing() !== undefined) {
      <app-catalog-item-form-modal [kind]="resource()" [item]="editing() ?? null" [busy]="saving()" (saved)="save($event)" (closed)="editing.set(undefined)" />
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogItemsComponent {
  private readonly api = inject(AdminConfigApi);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly resource = input.required<CatalogResource>();

  protected readonly items = rxResource({ params: () => this.resource(), stream: ({ params }) => this.api.catalogItems<CatalogRow & { icon?: string | null }>(params) });
  /** `undefined` = closed, `null` = adding, otherwise the row being edited. */
  protected readonly editing = signal<CatalogRow | null | undefined>(undefined);
  protected readonly saving = signal(false);
  protected readonly busyId = signal<Uuid | null>(null);
  protected readonly toggles = new PendingToggles();

  protected save(draft: CatalogDraft): void {
    const editing = this.editing();
    const resource = this.resource();
    const request = editing ? this.api.updateCatalogItem<AdminCancellationPolicy>(resource, editing.id, draft) : this.api.createCatalogItem<AdminCancellationPolicy>(resource, draft);
    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(undefined);
        this.toast.success('admin.catalog.saved');
        this.changed();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.apiError(err);
      },
    });
  }

  protected setActive(item: CatalogRow, isActive: boolean): void {
    this.toggles.start(item.id, isActive);
    this.api.updateCatalogItem<AdminCancellationPolicy>(this.resource(), item.id, { isActive }).subscribe({
      next: () => {
        this.items.update((list) => list?.map((i) => (i.id === item.id ? { ...i, isActive } : i)));
        this.toggles.done(item.id);
        this.toast.success(isActive ? 'admin.catalog.activated' : 'admin.catalog.deactivated');
        this.catalog.reload();
      },
      error: (err) => {
        this.toggles.failed(item.id, item.isActive);
        this.toast.apiError(err);
      },
    });
  }

  protected async remove(item: CatalogRow): Promise<void> {
    const ok = await this.confirm.ask({ title: 'admin.catalog.deleteTitle', message: 'admin.catalog.deleteMessage', messageParams: { name: item.nameAr }, okLabel: 'admin.catalog.delete', danger: true });
    if (!ok) return;
    this.busyId.set(item.id);
    this.api.deleteCatalogItem(this.resource(), item.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.show('admin.catalog.deleted');
        this.changed();
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.apiError(err);
      },
    });
  }

  /** The public catalog (pickers across the app) is cached: refresh it too. */
  private changed(): void {
    this.items.reload();
    this.catalog.reload();
  }
}
