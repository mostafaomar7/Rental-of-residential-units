import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';
import { Uuid } from '@api/api.types';
import { Task } from '@api/dto';
import { AdminPlatformApi } from '@api/endpoints/admin-platform.api';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { ToastService } from '@core/services/toast.service';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ResourceStateComponent } from '../../components/resource-state.component';

/** Requests shown at once; the API caps a page at 100. */
const REQUESTS_LIMIT = 50;
const PHOTOGRAPHERS_LIMIT = 100;

/**
 * Photo shoots owners requested without a photographer (`unassigned=true`): the admin picks an
 * active photographer for each, which notifies the photographer and the owner.
 */
@Component({
  selector: 'app-shoot-requests',
  imports: [TranslatePipe, AppDatePipe, IconComponent, ResourceStateComponent],
  template: `
    @if (requests.error()) {
      <app-resource-state class="mb-16" [resource]="requests" />
    } @else if (items().length) {
      <div class="card card-p mb-16">
        <div class="card-h">
          <h3>{{ 'admin.photos.requests.title' | translate }}</h3>
          <span class="pill pill-amber">{{ total() }}</span>
        </div>
        <p class="small muted mb-12">{{ 'admin.photos.requests.hint' | translate }}</p>
        <div class="rows">
          @for (t of items(); track t.id) {
            <div class="row wrap gap-12 request">
              <div class="grow">
                <div class="b">
                  {{ t.property.nameAr }}
                  @if (t.unit) {
                    • {{ t.unit.name }}
                  }
                </div>
                <div class="xs muted mt-4" [class.red]="t.overdue">
                  <app-icon name="calendar-days" size="sm" />{{ 'admin.photos.requests.due' | translate: { date: (t.dueAt | appDate: 'dateTime') } }}
                </div>
                @if (t.notes) {
                  <div class="xs mt-4" dir="auto">{{ t.notes }}</div>
                }
              </div>
              <select
                class="select photographer"
                #pick
                [attr.aria-label]="'admin.photos.requests.photographer' | translate"
                [disabled]="!photographers().length || busyId() === t.id"
              >
                <option value="">{{ (photographers().length ? 'admin.photos.requests.pick' : 'admin.photos.requests.none') | translate }}</option>
                @for (p of photographers(); track p.id) {
                  <option [value]="p.id">{{ p.fullName }}</option>
                }
              </select>
              <button type="button" class="btn btn-primary btn-sm" [disabled]="busyId() === t.id" (click)="assign(t, pick.value)">
                <app-icon name="user-check" size="sm" />{{ 'admin.photos.requests.assign' | translate }}
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .request {
      padding: 12px 0;
    }
    .photographer {
      width: auto;
      min-width: 200px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShootRequestsComponent {
  private readonly operationsApi = inject(HostOperationsApi);
  private readonly platformApi = inject(AdminPlatformApi);
  private readonly toast = inject(ToastService);

  /** A photographer was assigned (queue counters change). */
  readonly assigned = output<void>();

  protected readonly busyId = signal<Uuid | null>(null);

  protected readonly requests = rxResource({
    stream: () => this.operationsApi.tasks({ type: ['PHOTO_SHOOT'], status: ['TODO'], unassigned: true, limit: REQUESTS_LIMIT }),
  });
  private readonly photographerList = rxResource({
    stream: () =>
      this.platformApi.users({ role: 'PHOTOGRAPHER', status: 'ACTIVE', limit: PHOTOGRAPHERS_LIMIT }).pipe(map((page) => page.items)),
  });

  protected readonly items = computed(() => (this.requests.hasValue() ? this.requests.value().items : []));
  protected readonly total = computed(() => (this.requests.hasValue() ? this.requests.value().meta.total : 0));
  protected readonly photographers = computed(() => (this.photographerList.hasValue() ? this.photographerList.value() : []));

  protected assign(task: Task, photographerId: string): void {
    if (!photographerId) {
      this.toast.error('admin.photos.requests.pickFirst');
      return;
    }
    const name = this.photographers().find((p) => p.id === photographerId)?.fullName ?? '';
    this.busyId.set(task.id);
    this.operationsApi.updateTask(task.id, { assigneeId: photographerId }).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success('admin.photos.requests.assigned', { name });
        this.requests.reload();
        this.assigned.emit();
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.toast.apiError(err);
      },
    });
  }
}
