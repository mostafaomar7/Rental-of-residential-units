import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, catchError, finalize, map, of, switchMap } from 'rxjs';
import { IncidentCategory, IncidentSeverity, Task } from '@api/dto';
import { FieldApi } from '@api/endpoints/field.api';
import { ToastService } from '@core/services/toast.service';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { MAX_PHOTOS_PER_UPLOAD } from '../field.constants';
import { FieldDayService } from '../services/field-day.service';
import { pickedFiles } from '../services/picked-files';
import { LoadStateComponent } from './load-state.component';

export type ReportKind = 'damage' | 'incident';

const CATEGORIES: readonly IncidentCategory[] = ['MAINTENANCE', 'CLEANLINESS', 'LOCK', 'INTERNET', 'NOISE', 'SAFETY', 'DAMAGE', 'OTHER'];
const SEVERITIES: readonly IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

interface Evidence {
  file: File;
  preview: string;
}

/**
 * "New report" dialog: a damage case against the task's booking (charged to the guest) or an
 * operational incident on the task's unit, with evidence photos uploaded once it is filed.
 * Raised from a task, or without one — then the user picks a task of the selected day.
 * Render it with `@if`.
 */
@Component({
  selector: 'app-report-issue-modal',
  imports: [TranslatePipe, ModalComponent, FieldComponent, IconComponent, LoadStateComponent],
  templateUrl: './report-issue-modal.component.html',
  styles: `
    .full {
      width: 100%;
    }
    .full .tab {
      justify-content: center;
    }
    .textarea {
      min-height: 70px;
    }
    .thumb {
      padding: 0;
      border: 0;
      background: none;
    }
    .thumb-ph {
      cursor: pointer;
    }
    .thumb-ph input {
      display: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportIssueModalComponent {
  private readonly api = inject(FieldApi);
  private readonly toast = inject(ToastService);
  private readonly day = inject(FieldDayService);
  private readonly destroyRef = inject(DestroyRef);

  /** Task the report is raised from; when absent the dialog offers the day's tasks. */
  readonly task = input<Task | null>(null);
  readonly closed = output<void>();
  /** Emitted after a report is filed (the kind that was filed). */
  readonly reported = output<ReportKind>();

  protected readonly categories = CATEGORIES;
  protected readonly severities = SEVERITIES;

  /** Tasks of the selected day that have a unit to report on (only loaded without a `task`). */
  protected readonly candidates = rxResource({
    params: () => (this.task() ? undefined : { date: this.day.date() }),
    stream: ({ params }) => this.api.tasks(params.date).pipe(map((tasks) => tasks.filter((t) => t.unit))),
  });
  protected readonly pickedId = signal<string | null>(null);
  protected readonly context = computed<Task | null>(() => {
    const task = this.task();
    if (task) return task;
    const id = this.pickedId();
    return (this.candidates.hasValue() && this.candidates.value().find((t) => t.id === id)) || null;
  });

  /** Damage cases need a booking, incidents a unit. */
  protected readonly kinds = computed<ReportKind[]>(() => {
    const task = this.context();
    return [...(task?.booking ? (['damage'] as const) : []), ...(task?.unit ? (['incident'] as const) : [])];
  });
  protected readonly kind = linkedSignal<ReportKind[], ReportKind>({
    source: this.kinds,
    computation: (kinds, previous) => (previous && kinds.includes(previous.value) ? previous.value : (kinds[0] ?? 'incident')),
  });

  protected readonly category = signal<IncidentCategory>('MAINTENANCE');
  protected readonly severity = signal<IncidentSeverity>('MEDIUM');
  protected readonly description = signal('');
  protected readonly amount = signal('');
  protected readonly evidence = signal<Evidence[]>([]);
  protected readonly maxPhotos = MAX_PHOTOS_PER_UPLOAD;
  protected readonly busy = signal(false);

  constructor() {
    this.destroyRef.onDestroy(() => this.evidence().forEach((e) => URL.revokeObjectURL(e.preview)));
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
  }

  protected addPhotos(event: Event): void {
    const room = MAX_PHOTOS_PER_UPLOAD - this.evidence().length;
    const files = pickedFiles(event).slice(0, room);
    this.evidence.update((list) => [...list, ...files.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
  }

  protected removePhoto(item: Evidence): void {
    URL.revokeObjectURL(item.preview);
    this.evidence.update((list) => list.filter((e) => e !== item));
  }

  protected submit(): void {
    const task = this.context();
    const kind = this.kind();
    const description = this.description().trim();
    const amount = Number(this.amount());
    if (!task || !this.kinds().includes(kind)) return this.toast.error('field.supervisor.report.pickTask');
    if (!description) return this.toast.error('field.supervisor.report.descriptionRequired');
    if (kind === 'damage' && !(amount > 0)) return this.toast.error('field.supervisor.report.amountRequired');

    const files = this.evidence().map((e) => e.file);
    const filed$: Observable<boolean> =
      kind === 'damage'
        ? this.api
            .openDamageCase({ bookingId: task.booking!.id, taskId: task.id, description, amountClaimed: amount })
            .pipe(switchMap((c) => this.attach(files, () => this.api.addDamagePhotos(c.id, files))))
        : this.api
            .reportIncident({ unitId: task.unit!.id, bookingId: task.booking?.id, category: this.category(), severity: this.severity(), description })
            .pipe(switchMap((i) => this.attach(files, () => this.api.addIncidentPhotos(i.id, files))));

    this.busy.set(true);
    filed$
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (photosSaved) => {
          if (photosSaved) this.toast.success(kind === 'damage' ? 'field.supervisor.report.damageSent' : 'field.supervisor.report.incidentSent');
          else this.toast.error('field.supervisor.report.photosFailed');
          this.reported.emit(kind);
          this.closed.emit();
        },
        error: (err) => this.toast.apiError(err),
      });
  }

  /** Uploads the evidence to the filed report; `false` when that upload failed (the report itself stands). */
  private attach(files: readonly File[], upload: () => Observable<unknown>): Observable<boolean> {
    if (!files.length) return of(true);
    return upload().pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }
}
