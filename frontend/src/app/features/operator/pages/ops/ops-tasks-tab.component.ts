import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { Task, TaskStatus } from '@api/dto';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoadErrorComponent, LoadingComponent } from '../../components/async-state.component';
import { TaskTypePillComponent } from '../../components/task-type-pill.component';
import { OperatorPortfolioService } from '../../services/operator-portfolio.service';
import { unassignedKey } from '../../services/task-labels';
import { NewTaskModalComponent } from './new-task-modal.component';
import { TaskDetailModalComponent } from './task-detail-modal.component';

/** Board columns, in workflow order (cancelled tasks are left out). */
const BOARD: readonly TaskStatus[] = ['TODO', 'IN_PROGRESS', 'SUBMITTED', 'BLOCKED', 'DONE'];
/** Tasks loaded for the board; the column headers show the API's full counts. */
const BOARD_LIMIT = 100;

/** Kanban of field tasks: To do → In progress → Submitted → (Blocked) → Done. */
@Component({
  selector: 'app-ops-tasks-tab',
  imports: [TranslatePipe, AppDatePipe, LocalizePipe, IconComponent, LoadingComponent, LoadErrorComponent, TaskTypePillComponent, NewTaskModalComponent, TaskDetailModalComponent],
  template: `
    <div class="row between wrap mb-16">
      <div class="row wrap">
        <select class="select property-filter" #propertyFilter [attr.aria-label]="'operations.common.property' | translate" (change)="propertyId.set(propertyFilter.value || null)">
          <option value="">{{ 'operations.bookings.allProperties' | translate }}</option>
          @for (p of portfolio.properties(); track p.id) {
            <option [value]="p.id">{{ p | loc }}</option>
          }
        </select>
        <span class="small muted">{{ 'operations.tasks.hint' | translate }}</span>
      </div>
      <button type="button" class="btn btn-primary btn-sm" (click)="creating.set(true)">
        <app-icon name="plus" size="sm" />{{ 'operations.tasks.new' | translate }}
      </button>
    </div>

    @if (resource.isLoading() && !resource.hasValue()) {
      <app-loading />
    } @else if (resource.error()) {
      <app-load-error [error]="resource.error()" (retry)="resource.reload()" />
    } @else {
      <div class="kanban">
        @for (col of columns(); track col.status) {
          <section class="kcol" [attr.aria-label]="'status.task.' + col.status | translate">
            <div class="kcol-h">
              <span>{{ 'status.task.' + col.status | translate }}</span>
              <span class="pill pill-gray">{{ col.count }}</span>
            </div>
            @for (t of col.tasks; track t.id) {
              <button type="button" class="kcard" (click)="openTask.set(t)">
                <div class="row between">
                  <app-task-type-pill [type]="t.type" />
                  @if (t.overdue) {
                    <span class="pill pill-red">{{ 'operations.tasks.overdue' | translate }}</span>
                  }
                </div>
                <div class="b small mt-8">{{ t.title }}</div>
                <div class="xs muted truncate">{{ t.property.nameAr }}{{ t.unit ? ' • ' + t.unit.name : '' }}</div>
                @if (t.checklist.length) {
                  <div class="bar thin mt-8">
                    <div class="progress" [style.width.%]="progress(t)"></div>
                  </div>
                }
                <div class="row between mt-8 xs muted">
                  <span class="row gap-4"><app-icon name="user" size="sm" />{{ t.assignee?.fullName ?? (unassignedKey(t) | translate) }}</span>
                  <span class="nowrap">{{ t.dueAt | appDate: 'dateTime' }}</span>
                </div>
              </button>
            } @empty {
              <div class="xs muted center empty-col">{{ 'operations.tasks.emptyColumn' | translate }}</div>
            }
          </section>
        }
      </div>
    }

    @if (creating()) {
      <app-new-task-modal (closed)="creating.set(false)" (created)="onChanged()" />
    }
    @if (openTask(); as task) {
      <app-task-detail-modal [task]="task" (closed)="openTask.set(null)" (changed)="onChanged()" />
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .kanban {
      grid-template-columns: repeat(5, minmax(220px, 1fr));
    }
    .property-filter {
      width: auto;
      min-width: 200px;
    }
    .progress {
      background: var(--green-solid);
    }
    .kcard {
      text-align: start;
    }
    .empty-col {
      padding: 20px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpsTasksTabComponent {
  private readonly api = inject(HostOperationsApi);
  protected readonly portfolio = inject(OperatorPortfolioService);

  protected readonly unassignedKey = unassignedKey;
  protected readonly creating = signal(false);
  protected readonly openTask = signal<Task | null>(null);
  protected readonly propertyId = signal<Uuid | null>(null);

  protected readonly resource = rxResource({
    params: () => ({ status: [...BOARD], propertyId: this.propertyId() ?? undefined, limit: BOARD_LIMIT }),
    stream: ({ params }) => this.api.tasks(params),
  });

  protected readonly columns = computed(() => {
    if (!this.resource.hasValue()) return [];
    const { items, meta } = this.resource.value();
    return BOARD.map((status) => {
      const tasks = items.filter((t) => t.status === status);
      return { status, tasks, count: meta.board[status] ?? tasks.length };
    });
  });

  protected progress(t: Task): number {
    return (t.checklist.filter((c) => c.done).length / t.checklist.length) * 100;
  }

  protected onChanged(): void {
    this.creating.set(false);
    this.openTask.set(null);
    this.resource.reload();
  }
}
