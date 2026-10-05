import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { BOOKING_STEPS } from '../booking-draft';

/** Progress bar of the booking wizard. */
@Component({
  selector: 'app-booking-steps',
  imports: [TranslatePipe],
  template: `
    <div class="steps" [attr.aria-label]="'account.booking.stepsLabel' | translate">
      @for (s of steps; track s; let i = $index) {
        <div class="step" [class.done]="i + 1 < step()" [class.on]="i + 1 === step()" [attr.aria-current]="i + 1 === step() ? 'step' : 'false'">
          <div class="sb"></div>
          <div class="sl">{{ i + 1 }}. {{ 'account.booking.steps.' + s | translate }}</div>
        </div>
      }
    </div>
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingStepsComponent {
  readonly step = input.required<number>();

  protected readonly steps = BOOKING_STEPS;
}
