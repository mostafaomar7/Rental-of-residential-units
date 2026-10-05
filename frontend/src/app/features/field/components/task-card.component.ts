import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Task } from '@api/dto';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { checklistProgress } from '../services/task-rules';
import { TaskTypePillComponent } from './task-type-pill.component';

/** Task summary card in the field lists: type, unit, due time and checklist progress. */
@Component({
  selector: 'app-task-card',
  imports: [RouterLink, TranslatePipe, AppDatePipe, IconComponent, StatusPillComponent, TaskTypePillComponent],
  template: `
    @let t = task();
    <a class="task-card mt-12" [routerLink]="link()">
      <div class="row between">
        <app-task-type-pill [type]="t.type" />
        <span class="row gap-4">
          @if (!t.assignee) {
            <span class="pill pill-gray">{{ 'field.common.unassigned' | translate }}</span>
          }
          @if (t.overdue) {
            <span class="pill pill-red">{{ 'field.common.overdue' | translate }}</span>
          } @else {
            <app-status-pill domain="task" [code]="t.status" />
          }
        </span>
      </div>
      <div class="mt-12">
        <div class="b small">{{ t.title }}</div>
        <div class="xs muted">{{ t.property.nameAr }}@if (t.unit) { • {{ t.unit.name }}}</div>
        <div class="xs muted row gap-4 mt-4">
          <app-icon name="clock" size="sm" />
          <span class="ltr">{{ t.dueAt | appDate: 'time' }}</span>
        </div>
      </div>
      @if (progress().total) {
        <div class="row mt-12">
          <div class="bar thin grow"><div class="fill" [style.width.%]="progress().percent"></div></div>
          <span class="xs b">{{ progress().done }}/{{ progress().total }}</span>
        </div>
      }
    </a>
  `,
  styles: `
    :host {
      display: block;
    }
    .bar > .fill {
      background: var(--green-solid);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCardComponent {
  readonly task = input.required<Task>();
  /** Detail route prefix, e.g. `/supervisor/task`. */
  readonly linkBase = input.required<string>();

  protected readonly link = computed(() => [this.linkBase(), this.task().id]);
  protected readonly progress = computed(() => checklistProgress(this.task()));
}
