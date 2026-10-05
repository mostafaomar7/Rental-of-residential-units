import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { Uuid } from '@api/api.types';
import { AdminCity, AdminDistrict } from '@api/dto';
import { AdminConfigApi } from '@api/endpoints/admin-config.api';
import { CatalogService } from '@core/services/catalog.service';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ToggleComponent } from '@shared/ui/toggle/toggle.component';
import { ResourceStateComponent } from '../../components/resource-state.component';
import { PendingToggles } from '../../pending-toggles';
import { CatalogDraft, CatalogItemFormModalComponent } from './catalog-item-form-modal.component';

/** Cities (add / edit / activate / delete) and the districts of the selected city. */
@Component({
  selector: 'app-cities-editor',
  imports: [FormsModule, TranslatePipe, IconComponent, ToggleComponent, EmptyStateComponent, ResourceStateComponent, CatalogItemFormModalComponent],
  templateUrl: './cities-editor.component.html',
  styles: `
    :host {
      display: block;
    }
    .layout {
      gap: 24px;
      align-items: start;
    }
    tr.on {
      background: #fbfaf7;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CitiesEditorComponent {
  private readonly api = inject(AdminConfigApi);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly cities = rxResource({ stream: () => this.api.cities() });
  protected readonly selectedId = signal<Uuid | null>(null);
  protected readonly selected = computed(() => (this.cities.hasValue() ? (this.cities.value().find((c) => c.id === this.selectedId()) ?? null) : null));
  protected readonly districts = rxResource({
    params: () => this.selectedId() ?? undefined,
    stream: ({ params }) => this.api.districts(params),
  });

  /** `undefined` = closed, `null` = adding, otherwise the city being edited. */
  protected readonly editing = signal<AdminCity | null | undefined>(undefined);
  protected readonly busy = signal(false);
  protected readonly toggles = new PendingToggles();
  protected readonly districtAr = signal('');
  protected readonly districtEn = signal('');

  protected saveCity(draft: CatalogDraft): void {
    const editing = this.editing();
    const body = { slug: draft.slug ?? '', nameAr: draft.nameAr, nameEn: draft.nameEn, isActive: draft.isActive, sortOrder: draft.sortOrder };
    this.run(editing ? this.api.updateCity(editing.id, body) : this.api.createCity(body), 'admin.catalog.saved', () => {
      this.editing.set(undefined);
      this.cities.reload();
    });
  }

  protected setCityActive(city: AdminCity, isActive: boolean): void {
    this.toggles.start(city.id, isActive);
    this.run(
      this.api.updateCity(city.id, { isActive }),
      isActive ? 'admin.catalog.activated' : 'admin.catalog.deactivated',
      () => {
        this.cities.update((list) => list?.map((c) => (c.id === city.id ? { ...c, isActive } : c)));
        this.toggles.done(city.id);
      },
      () => this.toggles.failed(city.id, city.isActive),
    );
  }

  protected async removeCity(city: AdminCity): Promise<void> {
    if (!(await this.confirmDelete(city.nameAr))) return;
    this.run(this.api.deleteCity(city.id), 'admin.catalog.deleted', () => {
      if (this.selectedId() === city.id) this.selectedId.set(null);
      this.cities.reload();
    });
  }

  protected addDistrict(cityId: Uuid): void {
    const nameAr = this.districtAr().trim();
    const nameEn = this.districtEn().trim();
    if (!nameAr || !nameEn) return this.toast.error('admin.catalog.form.namesRequired');
    this.run(this.api.addDistrict(cityId, { nameAr, nameEn }), 'admin.catalog.saved', () => {
      this.districtAr.set('');
      this.districtEn.set('');
      this.districts.reload();
    });
  }

  protected setDistrictActive(district: AdminDistrict, isActive: boolean): void {
    this.toggles.start(district.id, isActive);
    this.run(
      this.api.updateDistrict(district.id, { isActive }),
      isActive ? 'admin.catalog.activated' : 'admin.catalog.deactivated',
      () => {
        this.districts.update((list) => list?.map((d) => (d.id === district.id ? { ...d, isActive } : d)));
        this.toggles.done(district.id);
      },
      () => this.toggles.failed(district.id, district.isActive),
    );
  }

  protected async removeDistrict(district: AdminDistrict): Promise<void> {
    if (!(await this.confirmDelete(district.nameAr))) return;
    this.run(this.api.deleteDistrict(district.id), 'admin.catalog.deleted', () => this.districts.reload());
  }

  private confirmDelete(name: string): Promise<boolean> {
    return this.confirm.ask({ title: 'admin.catalog.deleteTitle', message: 'admin.catalog.deleteMessage', messageParams: { name }, okLabel: 'admin.catalog.delete', danger: true });
  }

  /** Runs a change; the public catalog (cached for pickers across the app) is refreshed after it. */
  private run(request: Observable<unknown>, successKey: string, onDone: () => void, onError?: () => void): void {
    this.busy.set(true);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(successKey);
        onDone();
        this.catalog.reload();
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.apiError(err);
        onError?.();
      },
    });
  }
}
