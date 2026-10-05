import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Task } from '@api/dto';
import { AuthSrcDirective } from '@shared/directives/auth-src.directive';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { ChecklistComponent } from '../../../components/checklist.component';
import { SupervisorShellComponent } from '../../../components/field-shells.component';
import { LoadStateComponent } from '../../../components/load-state.component';
import { ReportIssueModalComponent } from '../../../components/report-issue-modal.component';
import { TaskTypePillComponent } from '../../../components/task-type-pill.component';
import { pickedFiles } from '../../../services/picked-files';
import { canStart, checklistProgress, isWorkable } from '../../../services/task-rules';
import { TaskWorkService } from '../../../services/task-work.service';

/** `/supervisor/task/:id` — work a task: start it, navigate, tick the checklist, document and hand over. */
@Component({
  selector: 'app-supervisor-task-page',
  imports: [
    TranslatePipe,
    AppDatePipe,
    AuthSrcDirective,
    IconComponent,
    StatusPillComponent,
    FieldComponent,
    ModalComponent,
    SupervisorShellComponent,
    TaskTypePillComponent,
    ChecklistComponent,
    LoadStateComponent,
    ReportIssueModalComponent,
  ],
  providers: [TaskWorkService],
  templateUrl: './supervisor-task.page.html',
  styles: `
    .bar > .fill {
      background: var(--green-solid);
    }
    .notes {
      min-height: 70px;
    }
    .photo-add.disabled {
      opacity: 0.45;
      pointer-events: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupervisorTaskPage {
  protected readonly work = inject(TaskWorkService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly resource = this.work.task;
  protected readonly task = computed(() => (this.resource.hasValue() ? this.resource.value() : undefined));
  protected readonly progress = computed(() => {
    const task = this.task();
    return task ? checklistProgress(task) : { done: 0, total: 0, percent: 0 };
  });
  protected readonly workable = computed(() => {
    const task = this.task();
    return !!task && isWorkable(task);
  });
  protected readonly startable = computed(() => {
    const task = this.task();
    return !!task && canStart(task);
  });
  protected readonly completeLabel = computed(() => completeLabel(this.task()));

  /** Hand-over notes sent with `complete`. */
  protected readonly notes = signal('');
  protected readonly reporting = signal(false);
  protected readonly blocking = signal(false);
  protected readonly blockReason = signal('');

  constructor() {
    this.work.connect(this.id);
  }

  protected value(event: Event): string {
    return (event.target as HTMLTextAreaElement).value;
  }

  protected capture(event: Event): void {
    this.work.upload(pickedFiles(event));
  }

  protected complete(): void {
    const key = this.task()?.type === 'INSPECTION' ? 'field.supervisor.toast.inspectionSent' : 'field.supervisor.toast.taskSent';
    this.work.finish(this.notes(), key, () => void this.router.navigate(['/supervisor']));
  }

  protected block(): void {
    if (!this.blockReason().trim()) return;
    this.work.block(this.blockReason(), () => {
      this.blocking.set(false);
      this.blockReason.set('');
    });
  }
}

function completeLabel(task: Task | undefined): string {
  switch (task?.type) {
    case 'READINESS':
    case 'CLEANING':
      return 'field.supervisor.task.declareReady';
    case 'INSPECTION':
      return 'field.supervisor.task.finishInspection';
    default:
      return 'field.supervisor.task.finishTask';
  }
}
