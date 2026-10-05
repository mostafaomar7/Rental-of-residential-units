import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { Task, UpdateTaskBody } from '@api/dto';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { AuthSrcDirective } from '@shared/directives/auth-src.directive';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { TaskTypePillComponent } from '../../components/task-type-pill.component';
import { fromDateTimeLocal, toDateTimeLocal } from '../../services/date-ranges';
import { Mutation } from '../../services/mutation';
import { unassignedKey } from '../../services/task-labels';

/** Task details (checklist, photos, notes) with reassignment, rescheduling and cancellation. */
@Component({
  selector: 'app-task-detail-modal',
  imports: [
    FormsModule,
    TranslatePipe,
    AuthSrcDirective,
    AppDatePipe,
    LocalizePipe,
    FieldComponent,
    IconComponent,
    ModalComponent,
    StatusPillComponent,
    TaskTypePillComponent,
  ],
  template: `
    @let t = task();
    <app-modal size="lg" [title]="t.title" [subtitle]="t.property.nameAr + (t.unit ? ' • ' + t.unit.name : '')" (closed)="closed.emit()">
      <div class="row wrap">
        <app-task-type-pill [type]="t.type" [withIcon]="false" />
        <app-status-pill domain="task" [code]="t.status" />
        @if (t.overdue) {
          <span class="pill pill-red">{{ 'operations.tasks.overdue' | translate }}</span>
        }
        <span class="pill pill-gray"><app-icon name="user" size="sm" />{{ t.assignee?.fullName ?? (unassignedKey(t) | translate) }}</span>
        <span class="pill pill-gray">{{ t.dueAt | appDate: 'dateTime' }}</span>
        @if (t.booking; as b) {
          <span class="pill pill-gray ltr">{{ b.number }}</span>
        }
      </div>

      @if (t.blockedReason) {
        <div class="notice red small mt-12">
          <app-icon name="alert-triangle" />
          <div>{{ 'operations.tasks.blockedReason' | translate }}: {{ t.blockedReason }}</div>
        </div>
      }

      @if (t.checklist.length) {
        <h4 class="bb mt-16 mb-8">{{ 'operations.tasks.checklist' | translate }}</h4>
        <div class="stack-sm">
          @for (c of t.checklist; track c.key) {
            <div class="check-item" [class.done]="c.done">
              <span class="cb">
                @if (c.done) {
                  <app-icon name="check" size="sm" />
                }
              </span>
              <span class="t">
                {{ c | loc: 'label' }}
                @if (c.note) {
                  <span class="xs muted">— {{ c.note }}</span>
                }
              </span>
            </div>
          }
        </div>
      }

      @if (t.photos.length) {
        <h4 class="bb mt-16 mb-8">{{ 'operations.tasks.photos' | translate }}</h4>
        <div class="thumbs-row">
          @for (photo of t.photos; track photo.id) {
            <img [authSrc]="photo.thumbUrl" [alt]="'operations.tasks.photoAlt' | translate" />
          }
        </div>
      }
      @if (t.notes) {
        <div class="owner-reply">{{ t.notes }}</div>
      }
      @if (t.reviewNote) {
        <div class="owner-reply">
          <div class="xs b gold-dark">{{ 'operations.tasks.reviewNote' | translate }}</div>
          {{ t.reviewNote }}
        </div>
      }

      @if (editable()) {
        <div class="grid g2 mt-16">
          @if (t.type !== 'PHOTO_SHOOT') {
            <app-field [label]="'operations.tasks.form.assignee' | translate" for="tk-assignee">
              <select id="tk-assignee" class="select" [(ngModel)]="assigneeId">
                <option [ngValue]="null">{{ 'operations.tasks.unassigned' | translate }}</option>
                @if (supervisors.hasValue()) {
                  @for (s of supervisors.value(); track s.id) {
                    <option [ngValue]="s.id">{{ s.fullName }}</option>
                  }
                }
              </select>
            </app-field>
          }
          <app-field [label]="'operations.tasks.form.due' | translate" for="tk-due">
            <input id="tk-due" class="input" type="datetime-local" [(ngModel)]="due" />
          </app-field>
        </div>
      }

      <ng-container modal-footer>
        @if (editable()) {
          <button type="button" class="btn btn-primary" [disabled]="saving.busy() || !changes()" (click)="save()">{{ 'common.save' | translate }}</button>
          <button type="button" class="btn btn-danger" [disabled]="saving.busy()" (click)="cancelTask()">{{ 'operations.tasks.cancel' | translate }}</button>
        }
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.close' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskDetailModalComponent {
  private readonly operationsApi = inject(HostOperationsApi);
  private readonly propertiesApi = inject(HostPropertiesApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly task = input.required<Task>();
  readonly closed = output<void>();
  readonly changed = output<Task>();

  protected readonly saving = new Mutation();
  protected readonly assigneeId = linkedSignal<Uuid | null>(() => this.task().assignee?.id ?? null);
  protected readonly due = linkedSignal(() => toDateTimeLocal(this.task().dueAt));

  /** Finished and cancelled tasks are read-only. */
  protected readonly unassignedKey = unassignedKey;
  protected readonly editable = computed(() => !['DONE', 'CANCELLED'].includes(this.task().status));

  protected readonly supervisors = rxResource({
    params: () => (this.editable() ? this.task().property.id : undefined),
    stream: ({ params }) => this.propertiesApi.supervisors(params),
  });

  /** Only the fields that differ from the task; `null` when nothing changed. */
  protected readonly changes = computed<UpdateTaskBody | null>(() => {
    const t = this.task();
    const body: UpdateTaskBody = {};
    if (this.assigneeId() !== (t.assignee?.id ?? null)) body.assigneeId = this.assigneeId();
    if (this.due() && this.due() !== toDateTimeLocal(t.dueAt)) body.dueAt = fromDateTimeLocal(this.due());
    return Object.keys(body).length ? body : null;
  });

  protected save(): void {
    const body = this.changes();
    if (!body) return;
    this.saving.run(this.operationsApi.updateTask(this.task().id, body), (task) => {
      this.toast.success('operations.tasks.toast.updated');
      this.changed.emit(task);
    });
  }

  protected async cancelTask(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'operations.tasks.cancelTitle',
      message: 'operations.tasks.cancelMessage',
      messageParams: { title: this.task().title },
      okLabel: 'operations.tasks.cancel',
      danger: true,
    });
    if (!ok) return;
    this.saving.run(this.operationsApi.cancelTask(this.task().id), (task) => {
      this.toast.show('operations.tasks.toast.cancelled');
      this.changed.emit(task);
    });
  }
}
