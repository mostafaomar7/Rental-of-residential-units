import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { FieldDayService } from '../services/field-day.service';

/** Glass bar under the app header: previous / next day, back to today, and refresh. */
@Component({
  selector: 'app-day-switcher',
  imports: [TranslatePipe, AppDatePipe, IconComponent],
  template: `
    <div class="glass mt-16 row between small day-bar">
      <button type="button" class="btn btn-glass btn-icon btn-sm" [attr.aria-label]="'field.common.day.previous' | translate" (click)="day.shift(-1)">
        <app-icon name="chevron-right" [mirror]="true" />
      </button>
      <div class="center grow">
        <div class="b">{{ day.isToday() ? ('common.today' | translate) : (day.date() | appDate: 'weekday') }}</div>
        <div class="xs soft">{{ day.date() | appDate: 'short' }}</div>
      </div>
      <button type="button" class="btn btn-glass btn-icon btn-sm" [attr.aria-label]="'field.common.day.next' | translate" (click)="day.shift(1)">
        <app-icon name="chevron-left" [mirror]="true" />
      </button>
    </div>
    <div class="row between mt-8 xs">
      @if (day.isToday()) {
        <span></span>
      } @else {
        <button type="button" class="link gold" (click)="day.reset()">{{ 'field.common.day.backToToday' | translate }}</button>
      }
      <button type="button" class="link gold row gap-4" [disabled]="refreshing()" (click)="refresh.emit()">
        <app-icon name="refresh-cw" size="sm" />{{ 'field.common.refresh' | translate }}
      </button>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .day-bar {
      padding: 6px 8px;
    }
    .soft {
      color: rgba(255, 255, 255, 0.7);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DaySwitcherComponent {
  protected readonly day = inject(FieldDayService);

  readonly refreshing = input(false);
  readonly refresh = output<void>();
}
