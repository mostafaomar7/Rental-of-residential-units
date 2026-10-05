import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ChecklistItem, OpsPhoto } from '@api/dto';
import { AuthSrcDirective } from '@shared/directives/auth-src.directive';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { ChecklistComponent } from '../../../components/checklist.component';
import { PhotographerShellComponent } from '../../../components/field-shells.component';
import { LoadStateComponent } from '../../../components/load-state.component';
import { pickedFiles } from '../../../services/picked-files';
import { canStart, isWorkable, needsRetake } from '../../../services/task-rules';
import { TaskWorkService } from '../../../services/task-work.service';

/** Photos filed under one shot of the shot list; `item` is null for photos outside the list. */
interface ShotPhotos {
  item: ChecklistItem | null;
  photos: OpsPhoto[];
}

/** `/photographer/shoot/:id` — shoot details, shot list, uploads per shot, QA results and submission. */
@Component({
  selector: 'app-photographer-shoot-page',
  imports: [
    TranslatePipe,
    AppDatePipe,
    LocalizePipe,
    AuthSrcDirective,
    IconComponent,
    StatusPillComponent,
    ChecklistComponent,
    PhotographerShellComponent,
    LoadStateComponent,
  ],
  providers: [TaskWorkService],
  templateUrl: './photographer-shoot.page.html',
  styles: `
    .info {
      gap: 6px;
    }
    .pill-red-solid {
      background: var(--red-solid);
      color: #fff;
    }
    .photo-add.disabled {
      opacity: 0.45;
      pointer-events: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotographerShootPage {
  protected readonly work = inject(TaskWorkService);

  readonly id = input.required<string>();

  protected readonly resource = this.work.task;
  protected readonly shoot = computed(() => (this.resource.hasValue() ? this.resource.value() : undefined));
  protected readonly workable = computed(() => {
    const shoot = this.shoot();
    return !!shoot && isWorkable(shoot);
  });
  protected readonly startable = computed(() => {
    const shoot = this.shoot();
    return !!shoot && canStart(shoot);
  });
  protected readonly retake = computed(() => {
    const shoot = this.shoot();
    return !!shoot && needsRetake(shoot);
  });
  /** Done or cancelled: the API takes no more photos, so rejected ones are final (no retake). */
  protected readonly closed = computed(() => {
    const status = this.shoot()?.status;
    return status === 'DONE' || status === 'CANCELLED';
  });
  protected readonly shotsDone = computed(() => this.shoot()?.checklist.filter((x) => x.done).length ?? 0);
  protected readonly rejected = computed(() => this.shoot()?.photos.filter((p) => p.review === 'REJECTED') ?? []);

  /** Photos per shot, then the ones not filed under a shot. */
  protected readonly shots = computed<ShotPhotos[]>(() => {
    const shoot = this.shoot();
    if (!shoot) return [];
    const keys = new Set(shoot.checklist.map((c) => c.key));
    return [
      ...shoot.checklist.map((item) => ({ item, photos: shoot.photos.filter((p) => p.checklistKey === item.key) })),
      { item: null, photos: shoot.photos.filter((p) => !p.checklistKey || !keys.has(p.checklistKey)) },
    ];
  });

  constructor() {
    this.work.connect(this.id);
  }

  protected upload(event: Event, item: ChecklistItem | null): void {
    this.work.upload(pickedFiles(event), item?.key);
  }

  protected submit(): void {
    this.work.finish('', 'field.photographer.toast.submitted');
  }
}
