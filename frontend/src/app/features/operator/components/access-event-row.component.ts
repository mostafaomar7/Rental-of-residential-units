import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AccessLog } from '@api/dto';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';

/** One smart-lock access-log entry (method, source, reason, time, result). Place inside a `.rows` list. */
@Component({
  selector: 'app-access-event-row',
  imports: [IconComponent, StatusPillComponent, AppDatePipe],
  template: `
    @let e = event();
    <div class="row between event">
      <div class="row gap-12">
        <span class="li-ic" [class]="e.success ? 'green' : 'red'">
          <app-icon [name]="e.success ? 'lock-open' : 'shield-x'" size="sm" />
        </span>
        <div>
          @if (unitName()) {
            <div class="xs gold-dark b">{{ unitName() }}</div>
          }
          <div class="b small ltr">{{ e.method }} • {{ e.source }}</div>
          @if (e.reason) {
            <div class="xs muted">{{ e.reason }}</div>
          }
        </div>
      </div>
      <div class="end">
        <div class="xs muted">{{ e.occurredAt | appDate: 'dateTime' }}</div>
        <app-status-pill domain="access" [code]="e.success ? 'success' : 'failed'" />
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .event {
      padding: 10px 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessEventRowComponent {
  readonly event = input.required<AccessLog>();
  /** Unit name, shown above the method when the list mixes several units. */
  readonly unitName = input('');
}
