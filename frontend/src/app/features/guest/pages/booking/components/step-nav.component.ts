import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ToastService } from '@core/services/toast.service';
import { IconComponent } from '@shared/ui/icon/icon.component';

/**
 * Back / continue buttons of a wizard step. While `blockedMessage` is set the continue button is
 * shown as disabled and explains why instead of advancing; while `busy` it shows a spinner.
 */
@Component({
  selector: 'app-step-nav',
  imports: [IconComponent, TranslatePipe],
  template: `
    <div class="row between mt-24 wrap">
      @if (showBack()) {
        <button type="button" class="btn btn-ghost" [disabled]="busy()" (click)="back.emit()">
          <app-icon name="arrow-right" size="sm" [mirror]="true" />{{ 'common.back' | translate }}
        </button>
      } @else {
        <span></span>
      }
      <button type="button" class="btn btn-primary btn-lg" [disabled]="busy()" [attr.aria-disabled]="blockedMessage() ? true : null" (click)="onNext()">
        @if (busy()) {
          <span class="spin"></span>
        }
        {{ label() | translate }} <app-icon name="arrow-left" size="sm" [mirror]="true" />
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepNavComponent {
  private readonly toast = inject(ToastService);

  /** Translation key of the continue button. */
  readonly label = input('account.booking.continue');
  readonly showBack = input(true);
  readonly busy = input(false);
  /** Translation key explaining why the step can't continue yet; `null` when it can. */
  readonly blockedMessage = input<string | null>(null);

  readonly back = output<void>();
  readonly next = output<void>();

  protected onNext(): void {
    const blocked = this.blockedMessage();
    if (blocked) this.toast.error(blocked);
    else this.next.emit();
  }
}
