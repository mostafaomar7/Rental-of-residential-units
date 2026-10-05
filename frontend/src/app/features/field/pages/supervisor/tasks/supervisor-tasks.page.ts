import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';
import { FieldApi } from '@api/endpoints/field.api';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { DaySwitcherComponent } from '../../../components/day-switcher.component';
import { SupervisorShellComponent } from '../../../components/field-shells.component';
import { LoadStateComponent } from '../../../components/load-state.component';
import { TaskCardComponent } from '../../../components/task-card.component';
import { FieldDayService } from '../../../services/field-day.service';
import { byUrgency, isClosed } from '../../../services/task-rules';

type TaskFilter = 'open' | 'closed';

const FILTERS: readonly TaskFilter[] = ['open', 'closed'];

/** `/supervisor` — the supervisor's tasks of the selected day (photo shoots excluded), overdue first. */
@Component({
  selector: 'app-supervisor-tasks-page',
  imports: [TranslatePipe, SupervisorShellComponent, TaskCardComponent, EmptyStateComponent, DaySwitcherComponent, LoadStateComponent],
  template: `
    <app-supervisor-shell [title]="'field.supervisor.tasks.title' | translate">
      <app-day-switcher header-extra [refreshing]="tasks.isLoading()" (refresh)="tasks.reload()" />

      @if (tasks.error() || !tasks.hasValue()) {
        <app-load-state [error]="tasks.error()" (retry)="tasks.reload()" />
      } @else {
        <div class="stats">
          <div class="tile center">
            <div class="h3">{{ stats().open }}</div>
            <div class="xs muted b">{{ 'field.supervisor.tasks.statOpen' | translate }}</div>
          </div>
          <div class="tile center">
            <div class="h3 red">{{ stats().overdue }}</div>
            <div class="xs muted b">{{ 'field.common.overdue' | translate }}</div>
          </div>
          <div class="tile center">
            <div class="h3 green">{{ stats().closed }}</div>
            <div class="xs muted b">{{ 'field.supervisor.tasks.statClosed' | translate }}</div>
          </div>
        </div>

        <div class="tabs mt-16 filters" role="tablist">
          @for (f of filters; track f) {
            <button type="button" role="tab" class="tab grow" [class.on]="filter() === f" [attr.aria-selected]="filter() === f" (click)="filter.set(f)">
              {{ 'field.supervisor.tasks.filter.' + f | translate }}
            </button>
          }
        </div>

        @for (task of list(); track task.id) {
          <app-task-card [task]="task" linkBase="/supervisor/task" />
        } @empty {
          <div class="card mt-12">
            <app-empty-state icon="check-check" [title]="'field.supervisor.tasks.emptyTitle' | translate" [subtitle]="'field.supervisor.tasks.emptyBody' | translate" />
          </div>
        }
      }
    </app-supervisor-shell>
  `,
  styles: `
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .stats .tile {
      padding: 12px;
    }
    .filters {
      width: 100%;
    }
    .filters .tab {
      justify-content: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupervisorTasksPage {
  private readonly api = inject(FieldApi);
  private readonly day = inject(FieldDayService);

  protected readonly filters = FILTERS;
  protected readonly filter = signal<TaskFilter>('open');

  protected readonly tasks = rxResource({
    params: () => ({ date: this.day.date() }),
    stream: ({ params }) => this.api.tasks(params.date).pipe(map((tasks) => tasks.filter((t) => t.type !== 'PHOTO_SHOOT').sort(byUrgency))),
  });

  private readonly all = computed(() => (this.tasks.hasValue() ? this.tasks.value() : []));
  protected readonly stats = computed(() => {
    const tasks = this.all();
    const closed = tasks.filter(isClosed).length;
    return { open: tasks.length - closed, overdue: tasks.filter((t) => t.overdue && !isClosed(t)).length, closed };
  });
  protected readonly list = computed(() => {
    const closed = this.filter() === 'closed';
    return this.all().filter((t) => isClosed(t) === closed);
  });
}
