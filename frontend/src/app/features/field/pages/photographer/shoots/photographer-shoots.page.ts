import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';
import { Task } from '@api/dto';
import { FieldApi } from '@api/endpoints/field.api';
import { AuthService } from '@core/services/auth.service';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { DaySwitcherComponent } from '../../../components/day-switcher.component';
import { PhotographerShellComponent } from '../../../components/field-shells.component';
import { LoadStateComponent } from '../../../components/load-state.component';
import { FieldDayService } from '../../../services/field-day.service';
import { byUrgency, needsRetake } from '../../../services/task-rules';

type ShootGroupId = 'retake' | 'todo' | 'awaitingQa' | 'done';

interface ShootGroup {
  id: ShootGroupId;
  shoots: Task[];
}

function groupOf(shoot: Task): ShootGroupId {
  if (needsRetake(shoot)) return 'retake';
  if (shoot.status === 'SUBMITTED') return 'awaitingQa';
  return shoot.status === 'DONE' || shoot.status === 'CANCELLED' ? 'done' : 'todo';
}

const GROUP_ORDER: readonly ShootGroupId[] = ['retake', 'todo', 'awaitingQa', 'done'];

/** `/photographer` — the day's photo shoots grouped by what needs doing (retakes, to shoot, in QA, done). */
@Component({
  selector: 'app-photographer-shoots-page',
  imports: [RouterLink, TranslatePipe, AppDatePipe, EmptyStateComponent, StatusPillComponent, PhotographerShellComponent, DaySwitcherComponent, LoadStateComponent],
  template: `
    <app-photographer-shell [title]="'field.photographer.shoots.title' | translate" [subtitle]="'field.photographer.shoots.hello' | translate: { name: firstName() }">
      <app-day-switcher header-extra [refreshing]="shoots.isLoading()" (refresh)="shoots.reload()" />

      @if (shoots.error() || !shoots.hasValue()) {
        <app-load-state [error]="shoots.error()" (retry)="shoots.reload()" />
      } @else {
        @for (group of groups(); track group.id) {
          <h3 class="bb mt-16 row between">
            <span>{{ 'field.photographer.shoots.group.' + group.id | translate }}</span>
            <span class="pill pill-gray">{{ group.shoots.length }}</span>
          </h3>
          @for (s of group.shoots; track s.id) {
            <a class="task-card mt-8" [routerLink]="['/photographer/shoot', s.id]">
              <div class="row between gap-12">
                <div class="grow">
                  <div class="b small">{{ s.property.nameAr }}@if (s.unit) { • {{ s.unit.name }}}</div>
                  <div class="xs muted">{{ s.title }} • <span class="ltr">{{ s.dueAt | appDate: 'time' }}</span></div>
                </div>
                @if (s.overdue && group.id !== 'done') {
                  <span class="pill pill-red">{{ 'field.common.overdue' | translate }}</span>
                } @else {
                  <app-status-pill domain="task" [code]="s.status" />
                }
              </div>
              @if (s.reviewNote) {
                <div class="xs mt-8 b" [class.red]="group.id === 'retake'" [class.green]="group.id !== 'retake'">{{ s.reviewNote }}</div>
              }
            </a>
          }
        } @empty {
          <app-empty-state icon="camera" [title]="'field.photographer.shoots.empty' | translate" />
        }
      }
    </app-photographer-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotographerShootsPage {
  private readonly api = inject(FieldApi);
  private readonly day = inject(FieldDayService);
  private readonly auth = inject(AuthService);

  protected readonly firstName = computed(() => this.auth.user()?.fullName.split(' ')[0] ?? '');

  protected readonly shoots = rxResource({
    params: () => ({ date: this.day.date() }),
    stream: ({ params }) => this.api.tasks(params.date).pipe(map((tasks) => tasks.filter((t) => t.type === 'PHOTO_SHOOT').sort(byUrgency))),
  });

  /** Non-empty groups in display order. */
  protected readonly groups = computed<ShootGroup[]>(() => {
    const shoots = this.shoots.hasValue() ? this.shoots.value() : [];
    return GROUP_ORDER.map((id) => ({ id, shoots: shoots.filter((s) => groupOf(s) === id) })).filter((g) => g.shoots.length);
  });
}
