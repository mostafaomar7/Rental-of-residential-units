import { DestroyRef, Injectable, Signal, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, catchError, concatMap, finalize, from, last, throwError } from 'rxjs';
import { ApiError } from '@api/api-error';
import { Uuid } from '@api/api.types';
import { ChecklistItem, Task } from '@api/dto';
import { FieldApi } from '@api/endpoints/field.api';
import { LangService } from '@core/services/lang.service';
import { ToastService } from '@core/services/toast.service';
import { localize } from '@shared/pipes/localize.pipe';
import { MAX_PHOTOS_PER_UPLOAD } from '../field.constants';

export type TaskAction = 'start' | 'upload' | 'finish' | 'block';

/**
 * One task being worked on (supervisor task / photographer shoot page): loads it and runs the
 * field actions against the API. Provide it on the page and call {@link connect} with the route id.
 */
@Injectable()
export class TaskWorkService {
  private readonly api = inject(FieldApi);
  private readonly toast = inject(ToastService);
  private readonly lang = inject(LangService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly id = signal<Signal<Uuid> | null>(null);

  readonly task = rxResource({
    params: () => this.id()?.(),
    stream: ({ params: id }) => this.api.task(id),
  });
  /** The action in flight; pages disable the other actions meanwhile. */
  readonly busy = signal<TaskAction | null>(null);
  /** Checklist items whose update is still in flight. */
  readonly savingKeys = signal<ReadonlySet<string>>(new Set());

  connect(id: Signal<Uuid>): void {
    this.id.set(id);
  }

  /** Starts the task (claims it when unassigned, resumes it when blocked). */
  start(): void {
    this.run('start', (id) => this.api.start(id), 'field.task.toast.started');
  }

  /** Uploads in batches the API accepts; `checklistKey` files the photos under a checklist item. */
  upload(files: readonly File[], checklistKey?: string): void {
    if (!files.length) return;
    const batches = Array.from({ length: Math.ceil(files.length / MAX_PHOTOS_PER_UPLOAD) }, (_, i) =>
      files.slice(i * MAX_PHOTOS_PER_UPLOAD, (i + 1) * MAX_PHOTOS_PER_UPLOAD),
    );
    this.run(
      'upload',
      (id) => from(batches).pipe(concatMap((batch) => this.api.uploadPhotos(id, batch, checklistKey)), last()),
      'field.task.toast.uploaded',
      { count: files.length },
    );
  }

  /**
   * Hands the task over: photo shoots go to QA (`submit`), everything else is completed. Should
   * `complete` be the wrong call for the task, the API answers `USE_SUBMIT` and we submit instead.
   */
  finish(notes: string, successKey: string, then?: () => void): void {
    const shoot = this.current()?.type === 'PHOTO_SHOOT';
    this.run(
      'finish',
      (id) =>
        shoot
          ? this.api.submitShoot(id)
          : this.api
              .complete(id, notes.trim() || null)
              .pipe(catchError((err) => (ApiError.from(err).is('USE_SUBMIT') ? this.api.submitShoot(id) : throwError(() => err)))),
      successKey,
      undefined,
      then,
    );
  }

  block(reason: string, then?: () => void): void {
    this.run('block', (id) => this.api.block(id, reason.trim()), 'field.task.toast.blocked', undefined, then);
  }

  /** Ticks/unticks an item at once and saves it; the tick is rolled back if the save fails. */
  toggle(item: ChecklistItem): void {
    const task = this.current();
    if (!task || this.savingKeys().has(item.key)) return;
    const done = !item.done;
    this.patchItem(item.key, done);
    this.savingKeys.update((keys) => new Set(keys).add(item.key));
    this.api
      .updateChecklist(task.id, [{ key: item.key, done, note: item.note }])
      .pipe(
        finalize(() =>
          this.savingKeys.update((keys) => {
            const next = new Set(keys);
            next.delete(item.key);
            return next;
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          // With other ticks still in flight, keep the optimistic state; the last response wins.
          if (this.savingKeys().size === 1) this.task.set(updated);
        },
        error: (err) => {
          this.patchItem(item.key, item.done);
          this.toast.apiError(err);
        },
      });
  }

  private run(action: TaskAction, request: (id: Uuid) => Observable<Task>, successKey: string, params?: Record<string, unknown>, then?: () => void): void {
    const task = this.current();
    if (!task || this.busy()) return;
    this.busy.set(action);
    request(task.id)
      .pipe(
        finalize(() => this.busy.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          this.task.set(updated);
          this.toast.success(successKey, params);
          then?.();
        },
        error: (err) => this.showFailure(err, task),
      });
  }

  /** Hand-over refusals get task-specific messages; anything else the generic API error text. */
  private showFailure(err: unknown, task: Task): void {
    const error = ApiError.from(err);
    if (error.is('CHECKLIST_INCOMPLETE')) {
      const items = this.missingLabels(error.details, task);
      if (items) return this.toast.error('field.task.errors.checklistMissing', { items });
    }
    if (error.is('PHOTOS_REQUIRED')) return this.toast.error('field.task.errors.photosRequired');
    this.toast.apiError(err);
  }

  /** Labels of the checklist items listed in `details.missing` (keys or `{ key }` objects), as a list. */
  private missingLabels(details: unknown, task: Task): string {
    const missing = (details as { missing?: unknown } | null)?.missing;
    if (!Array.isArray(missing)) return '';
    const keys = missing.map((m) => (typeof m === 'string' ? m : (m as { key?: string } | null)?.key));
    const labels = task.checklist
      .filter((item) => keys.includes(item.key))
      .map(({ labelAr, labelEn }) => localize({ labelAr, labelEn }, 'label', this.lang.lang()));
    return new Intl.ListFormat(this.lang.locale()).format(labels);
  }

  private current(): Task | undefined {
    return this.task.hasValue() ? this.task.value() : undefined;
  }

  private patchItem(key: string, done: boolean): void {
    this.task.update((task) => task && { ...task, checklist: task.checklist.map((c) => (c.key === key ? { ...c, done } : c)) });
  }
}
