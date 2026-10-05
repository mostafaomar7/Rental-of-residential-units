import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CatalogResource } from '@api/endpoints/admin-config.api';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { TabItem, TabsComponent } from '@shared/ui/tabs/tabs.component';
import { CatalogItemsComponent } from './catalog-items.component';
import { CitiesEditorComponent } from './cities-editor.component';
import { DeliveriesComponent } from './deliveries.component';
import { NotificationTemplatesComponent } from './notification-templates.component';
import { PlatformSettingsComponent } from './platform-settings.component';

const TABS: readonly TabItem[] = [
  { id: 'platform', label: 'admin.settings.tabs.platform', icon: 'settings-2' },
  { id: 'catalog', label: 'admin.settings.tabs.catalog', icon: 'layers' },
  { id: 'templates', label: 'admin.settings.tabs.templates', icon: 'message-square' },
  { id: 'deliveries', label: 'admin.settings.tabs.deliveries', icon: 'send' },
];

const CATALOG_TABS: readonly TabItem[] = [
  { id: 'cities', label: 'admin.catalog.lists.cities' },
  { id: 'property-types', label: 'admin.catalog.lists.property-types' },
  { id: 'amenities', label: 'admin.catalog.lists.amenities' },
  { id: 'cancellation-policies', label: 'admin.catalog.lists.cancellation-policies' },
];

/** `/admin/settings` — platform settings, catalog (cities, types, amenities, policies), notification templates and deliveries (SRS §ADM). */
@Component({
  selector: 'app-settings-page',
  imports: [TranslatePipe, PageHeaderComponent, TabsComponent, PlatformSettingsComponent, CitiesEditorComponent, CatalogItemsComponent, NotificationTemplatesComponent, DeliveriesComponent],
  template: `
    <app-page-header [title]="'admin.settings.title' | translate" [subtitle]="'admin.settings.subtitle' | translate" />
    <div class="mb-16"><app-tabs variant="tabs-line" [items]="tabs" [(active)]="tab" /></div>

    @switch (tab()) {
      @case ('catalog') {
        <div class="mb-16"><app-tabs [items]="catalogTabs" [(active)]="catalogTab" /></div>
        @if (catalogTab() === 'cities') {
          <app-cities-editor />
        } @else {
          <app-catalog-items [resource]="catalogResource()" />
        }
      }
      @case ('templates') {
        <app-notification-templates />
      }
      @case ('deliveries') {
        <app-deliveries />
      }
      @default {
        <app-platform-settings />
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  protected readonly tabs = TABS;
  protected readonly catalogTabs = CATALOG_TABS;
  protected readonly tab = signal<string>('platform');
  protected readonly catalogTab = signal<string>('cities');

  protected catalogResource(): CatalogResource {
    return this.catalogTab() as CatalogResource;
  }
}
