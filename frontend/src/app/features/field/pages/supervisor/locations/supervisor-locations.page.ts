import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Task } from '@api/dto';
import { FieldApi } from '@api/endpoints/field.api';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { DaySwitcherComponent } from '../../../components/day-switcher.component';
import { SupervisorShellComponent } from '../../../components/field-shells.component';
import { LoadStateComponent } from '../../../components/load-state.component';
import { FieldDayService } from '../../../services/field-day.service';
import { byUrgency, isClosed } from '../../../services/task-rules';

interface Stop {
  property: Task['property'];
  tasks: Task[];
}

/** `/supervisor/locations` — the day's open tasks grouped by property, as numbered stops with navigation links. */
@Component({
  selector: 'app-supervisor-locations-page',
  imports: [RouterLink, TranslatePipe, AppDatePipe, IconComponent, EmptyStateComponent, SupervisorShellComponent, DaySwitcherComponent, LoadStateComponent],
  template: `
    <app-supervisor-shell [title]="'field.supervisor.locations.title' | translate" [subtitle]="'field.supervisor.locations.subtitle' | translate">
      <app-day-switcher header-extra [refreshing]="tasks.isLoading()" (refresh)="tasks.reload()" />

      @if (tasks.error() || !tasks.hasValue()) {
        <app-load-state [error]="tasks.error()" (retry)="tasks.reload()" />
      } @else {
        @for (stop of stops(); track stop.property.id; let n = $index) {
          <div class="card card-p-sm mt-12">
            <div class="row gap-12">
              <span class="li-ic navy">{{ n + 1 }}</span>
              <div class="grow">
                <div class="b small">{{ stop.property.nameAr }}</div>
                @if (stop.property.address) {
                  <div class="xs muted">{{ stop.property.address }}</div>
                }
              </div>
              @if (stop.property.navigationUrl) {
                <a class="btn btn-primary btn-icon btn-sm" [href]="stop.property.navigationUrl" target="_blank" rel="noopener" [attr.aria-label]="'field.common.navigate' | translate">
                  <app-icon name="navigation" size="sm" />
                </a>
              }
            </div>
            @for (task of stop.tasks; track task.id) {
              <a class="li mt-8" [routerLink]="['/supervisor/task', task.id]">
                <div class="grow">
                  <div class="small b">{{ task.title }}</div>
                  <div class="xs muted">
                    @if (task.unit) {
                      {{ task.unit.name }} •
                    }
                    <span class="ltr">{{ task.dueAt | appDate: 'time' }}</span>
                    @if (task.overdue) {
                      • <span class="red b">{{ 'field.common.overdue' | translate }}</span>
                    }
                  </div>
                </div>
                <app-icon name="chevron-left" size="sm" [mirror]="true" />
              </a>
            }
          </div>
        } @empty {
          <div class="card mt-12">
            <app-empty-state icon="map-pin-off" [title]="'field.supervisor.locations.empty' | translate" />
          </div>
        }
      }
    </app-supervisor-shell>
  `,
  styles: `
    .li-ic.navy {
      background: var(--navy);
      color: var(--gold);
      font-weight: 900;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupervisorLocationsPage {
  private readonly api = inject(FieldApi);
  private readonly day = inject(FieldDayService);

  protected readonly tasks = rxResource({
    params: () => ({ date: this.day.date() }),
    stream: ({ params }) => this.api.tasks(params.date),
  });

  /** Properties in the order of their most urgent open task. */
  protected readonly stops = computed<Stop[]>(() => {
    if (!this.tasks.hasValue()) return [];
    const open = this.tasks.value().filter((t) => t.type !== 'PHOTO_SHOOT' && !isClosed(t)).sort(byUrgency);
    const stops = new Map<string, Stop>();
    for (const task of open) {
      const stop = stops.get(task.property.id) ?? { property: task.property, tasks: [] };
      stop.tasks.push(task);
      stops.set(task.property.id, stop);
    }
    return [...stops.values()];
  });
}
