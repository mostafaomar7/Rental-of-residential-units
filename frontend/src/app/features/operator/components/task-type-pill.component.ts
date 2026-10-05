import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TaskType } from '@api/dto';
import { IconComponent } from '@shared/ui/icon/icon.component';

/** Icon and pill tone of each task type. */
const TASK_TYPE_META: Record<TaskType, { icon: string; tone: string }> = {
  CLEANING: { icon: 'sparkles', tone: 'blue' },
  READINESS: { icon: 'check-circle-2', tone: 'green' },
  INSPECTION: { icon: 'search-check', tone: 'gold' },
  MAINTENANCE: { icon: 'wrench', tone: 'red' },
  PHOTO_SHOOT: { icon: 'camera', tone: 'navy' },
};

/** Coloured pill with the icon and label of a field-task type. */
@Component({
  selector: 'app-task-type-pill',
  imports: [TranslatePipe, IconComponent],
  template: `
    @if (withIcon()) {
      <app-icon [name]="meta().icon" size="sm" />
    }
    {{ 'domain.api.taskType.' + type() | translate }}
  `,
  host: { '[class]': "'pill pill-' + meta().tone" },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskTypePillComponent {
  readonly type = input.required<TaskType>();
  readonly withIcon = input(true);

  protected readonly meta = computed(() => TASK_TYPE_META[this.type()]);
}
