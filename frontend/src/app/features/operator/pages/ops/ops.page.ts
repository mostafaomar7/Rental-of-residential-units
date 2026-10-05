import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { TabLink, TabLinksComponent } from '@shared/ui/tabs/tabs.component';
import { OpsDamagesTabComponent } from './ops-damages-tab.component';
import { OpsIncidentsTabComponent } from './ops-incidents-tab.component';
import { OpsRequestsTabComponent } from './ops-requests-tab.component';
import { OpsTasksTabComponent } from './ops-tasks-tab.component';

const OPS_TABS: readonly TabLink[] = [
  { label: 'operations.ops.tabs.tasks', icon: 'kanban', link: '/operator/ops/tasks' },
  { label: 'operations.ops.tabs.incidents', icon: 'siren', link: '/operator/ops/incidents' },
  { label: 'operations.ops.tabs.damages', icon: 'shield-alert', link: '/operator/ops/damages' },
  { label: 'operations.ops.tabs.requests', icon: 'clock', link: '/operator/ops/requests' },
];

/** `/operator/ops/:tab` — field task board, incidents, damage cases and stay requests (SRS §OPS, §POL). */
@Component({
  selector: 'app-ops-page',
  imports: [TranslatePipe, PageHeaderComponent, TabLinksComponent, OpsTasksTabComponent, OpsIncidentsTabComponent, OpsDamagesTabComponent, OpsRequestsTabComponent],
  template: `
    <app-page-header [title]="'operations.ops.title' | translate" [subtitle]="'operations.ops.subtitle' | translate" />
    <div class="mb-16"><app-tab-links [items]="tabs" /></div>
    @switch (tab()) {
      @case ('incidents') {
        <app-ops-incidents-tab />
      }
      @case ('damages') {
        <app-ops-damages-tab />
      }
      @case ('requests') {
        <app-ops-requests-tab />
      }
      @default {
        <app-ops-tasks-tab />
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpsPage {
  readonly tab = input<string>('tasks');

  protected readonly tabs = OPS_TABS;
}
