import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { PlatformSetting } from '@api/dto';
import { AdminConfigApi } from '@api/endpoints/admin-config.api';
import { CatalogService } from '@core/services/catalog.service';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ResourceStateComponent } from '../../components/resource-state.component';
import { SettingRowComponent } from './setting-row.component';

/** Platform settings (key / value with defaults): search, edit, reset to default. */
@Component({
  selector: 'app-platform-settings',
  imports: [FormsModule, TranslatePipe, IconComponent, EmptyStateComponent, ResourceStateComponent, SettingRowComponent],
  template: `
    <div class="card card-p">
      <div class="card-h">
        <div class="search search-box">
          <app-icon name="search" />
          <input type="search" [placeholder]="'admin.settings.searchPlaceholder' | translate" [attr.aria-label]="'common.search' | translate" [(ngModel)]="query" />
        </div>
        <span class="xs muted">{{ 'admin.settings.publicHint' | translate }}</span>
      </div>
      <app-resource-state [resource]="settings" />
      @if (settings.hasValue()) {
        <div class="rows">
          @for (s of visible(); track s.key) {
            <app-setting-row [setting]="s" [busy]="busyKey() === s.key" (saved)="save(s, $event)" (reset)="reset(s)" />
          } @empty {
            <app-empty-state icon="settings" [title]="'admin.settings.empty' | translate" />
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .search-box {
      max-width: 320px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformSettingsComponent {
  private readonly api = inject(AdminConfigApi);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly settings = rxResource({ stream: () => this.api.settings() });
  protected readonly query = signal('');
  protected readonly busyKey = signal<string | null>(null);

  protected readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.settings.hasValue() ? this.settings.value() : [];
    return q ? all.filter((s) => `${s.key} ${s.description}`.toLowerCase().includes(q)) : all;
  });

  protected save(setting: PlatformSetting, value: unknown): void {
    this.busyKey.set(setting.key);
    this.api.updateSetting(setting.key, value).subscribe({
      next: (res) => this.applied(setting, res.value, 'admin.settings.saved'),
      error: (err) => this.failed(setting, err),
    });
  }

  protected async reset(setting: PlatformSetting): Promise<void> {
    const ok = await this.confirm.ask({ title: 'admin.settings.resetTitle', message: 'admin.settings.resetMessage', messageParams: { key: setting.key }, okLabel: 'admin.settings.reset' });
    if (!ok) return;
    this.busyKey.set(setting.key);
    this.api.resetSetting(setting.key).subscribe({
      next: (res) => this.applied(setting, res.value, 'admin.settings.resetDone'),
      error: (err) => this.failed(setting, err),
    });
  }

  private applied(setting: PlatformSetting, value: unknown, successKey: string): void {
    this.busyKey.set(null);
    this.settings.update((list) => list?.map((s) => (s.key === setting.key ? { ...s, value } : s)));
    this.toast.success(successKey, { key: setting.key });
    // Public settings are part of the cached catalog used across the app.
    if (setting.public) this.catalog.reload();
  }

  private failed(setting: PlatformSetting, err: unknown): void {
    this.busyKey.set(null);
    // A switch keeps its own state: hand the row a new copy of the unchanged setting to reset it
    // (text editors keep what was typed so it can be corrected).
    if (typeof setting.value === 'boolean') this.settings.update((list) => list?.map((s) => (s.key === setting.key ? { ...s } : s)));
    this.toast.apiError(err);
  }
}
