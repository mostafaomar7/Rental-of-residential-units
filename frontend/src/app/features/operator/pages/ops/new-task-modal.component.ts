import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { CreateTaskBody, Task, TaskType } from '@api/dto';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { ToastService } from '@core/services/toast.service';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { fromDateTimeLocal, toDateTimeLocal } from '../../services/date-ranges';
import { Mutation } from '../../services/mutation';
import { OperatorPortfolioService } from '../../services/operator-portfolio.service';

export const TASK_TYPES: readonly TaskType[] = ['CLEANING', 'READINESS', 'INSPECTION', 'MAINTENANCE', 'PHOTO_SHOOT'];
/** New tasks are due in this many hours by default. */
const DEFAULT_DUE_HOURS = 4;
const HOUR_MS = 3_600_000;

/** Creates a field task, optionally for a unit and assigned to one of the property's supervisors. */
@Component({
  selector: 'app-new-task-modal',
  imports: [FormsModule, TranslatePipe, LocalizePipe, FieldComponent, ModalComponent, IconComponent],
  template: `
    <app-modal size="sm" [title]="'operations.tasks.new' | translate" (closed)="closed.emit()">
      <div class="stack">
        <app-field [label]="'operations.tasks.form.type' | translate" for="nt-type">
          <select id="nt-type" class="select" [(ngModel)]="type">
            @for (t of types; track t) {
              <option [ngValue]="t">{{ 'domain.api.taskType.' + t | translate }}</option>
            }
          </select>
        </app-field>
        <app-field [label]="'operations.common.property' | translate" for="nt-property">
          <select id="nt-property" class="select" [(ngModel)]="propertyId">
            @for (p of portfolio.properties(); track p.id) {
              <option [ngValue]="p.id">{{ p | loc }}</option>
            }
          </select>
        </app-field>
        <app-field [label]="'operations.common.unit' | translate" for="nt-unit">
          <select id="nt-unit" class="select" [(ngModel)]="unitId">
            <option [ngValue]="null">{{ 'operations.tasks.form.wholeProperty' | translate }}</option>
            @for (u of units(); track u.id) {
              <option [ngValue]="u.id">{{ u.name }}</option>
            }
          </select>
        </app-field>
        <app-field [label]="'operations.tasks.form.title' | translate" for="nt-title">
          <input id="nt-title" class="input" [placeholder]="'operations.tasks.form.titlePlaceholder' | translate" [(ngModel)]="title" />
        </app-field>
        <app-field [label]="'operations.tasks.form.notes' | translate" for="nt-notes">
          <textarea id="nt-notes" class="textarea" [(ngModel)]="notes"></textarea>
        </app-field>
        @if (type() === 'PHOTO_SHOOT') {
          <div class="notice gold small">
            <app-icon name="camera" />
            <div>{{ 'operations.tasks.form.photographerByRawaaf' | translate }}</div>
          </div>
        } @else {
          <app-field [label]="'operations.tasks.form.assignee' | translate" for="nt-assignee">
            <select id="nt-assignee" class="select" [(ngModel)]="assigneeId">
              <option [ngValue]="null">{{ 'operations.tasks.unassigned' | translate }}</option>
              @if (supervisors.hasValue()) {
                @for (s of supervisors.value(); track s.id) {
                  <option [ngValue]="s.id">{{ s.fullName }}</option>
                }
              }
            </select>
          </app-field>
        }
        <app-field [label]="'operations.tasks.form.due' | translate" for="nt-due">
          <input id="nt-due" type="datetime-local" class="input" [(ngModel)]="due" />
        </app-field>
      </div>
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="creating.busy() || !valid()" (click)="submit()">{{ 'operations.tasks.form.submit' | translate }}</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewTaskModalComponent {
  private readonly operationsApi = inject(HostOperationsApi);
  private readonly propertiesApi = inject(HostPropertiesApi);
  private readonly toast = inject(ToastService);
  protected readonly portfolio = inject(OperatorPortfolioService);

  readonly closed = output<void>();
  readonly created = output<Task>();

  protected readonly types = TASK_TYPES;
  protected readonly type = signal<TaskType>('CLEANING');
  protected readonly propertyId = linkedSignal<Uuid | null>(() => this.portfolio.properties()[0]?.id ?? null);
  protected readonly units = computed(() => this.portfolio.property(this.propertyId())?.units ?? []);
  /** Reset when the property changes. */
  protected readonly unitId = linkedSignal<Uuid | null, Uuid | null>({ source: this.propertyId, computation: () => null });
  protected readonly assigneeId = linkedSignal<Uuid | null, Uuid | null>({ source: this.propertyId, computation: () => null });
  protected readonly title = signal('');
  protected readonly notes = signal('');
  protected readonly due = signal(toDateTimeLocal(new Date(Date.now() + DEFAULT_DUE_HOURS * HOUR_MS).toISOString()));
  protected readonly creating = new Mutation();

  /** Field staff assigned to the chosen property. */
  protected readonly supervisors = rxResource({
    params: () => this.propertyId() ?? undefined,
    stream: ({ params }) => this.propertiesApi.supervisors(params),
  });

  protected readonly valid = computed(() => !!this.propertyId() && !!this.title().trim() && !!this.due());

  protected submit(): void {
    const propertyId = this.propertyId();
    if (!propertyId || !this.valid()) return;
    const body: CreateTaskBody = {
      type: this.type(),
      propertyId,
      unitId: this.unitId() ?? undefined,
      // Rawaaf assigns photographers to shoots; the property's supervisors are only for other tasks.
      assigneeId: this.type() === 'PHOTO_SHOOT' ? undefined : (this.assigneeId() ?? undefined),
      title: this.title().trim(),
      notes: this.notes().trim() || null,
      dueAt: fromDateTimeLocal(this.due()),
    };
    this.creating.run(this.operationsApi.createTask(body), (task) => {
      this.toast.success('operations.tasks.toast.created');
      this.created.emit(task);
    });
  }
}
