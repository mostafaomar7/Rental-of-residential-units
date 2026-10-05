import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { DoorCode, Stay } from '@api/dto';
import { BookingsApi } from '@api/endpoints/bookings.api';
import { ToastService } from '@core/services/toast.service';
import { nightsBetween, today } from '@core/utils/date.utils';
import { AppDatePipe, PluralPipe } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';

/** `relocked` = closed again automatically after being opened. */
type UnlockState = 'idle' | 'busy' | 'open' | 'relocked';

/** How long the "door open" state is shown before it reads as locked again. */
const AUTO_RELOCK_MS = 8000;

/**
 * Digital key (SRS ACC): remote unlock and the door PIN (revealed only on tap — rate-limited and
 * logged) while the key is active; otherwise why it isn't (identity, compliance, not yet, ended).
 */
@Component({
  selector: 'app-stay-key-card',
  imports: [RouterLink, TranslatePipe, AppDatePipe, PluralPipe, IconComponent, StatusPillComponent],
  templateUrl: './stay-key-card.component.html',
  styles: `
    :host {
      display: block;
    }
    .soft-white {
      color: rgba(255, 255, 255, 0.75);
    }
    .faint {
      color: rgba(255, 255, 255, 0.6);
    }
    .centered {
      justify-content: center;
    }
    .pin {
      font-size: 22px;
      letter-spacing: 5px;
    }
    .unlock-btn.idle {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      box-shadow: none;
      cursor: default;
    }
    .unlock-btn.idle:hover {
      transform: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StayKeyCardComponent {
  private readonly bookingsApi = inject(BookingsApi);
  private readonly toast = inject(ToastService);

  readonly stay = input.required<Stay>();
  /** Reward points for reviewing this stay, when it can still be reviewed. */
  readonly reviewPoints = input<number | null>(null);
  /** The key needs identity verification first. */
  readonly verifyIdentity = output<void>();

  protected readonly access = computed(() => this.stay().access);
  protected readonly daysToArrival = computed(() => Math.max(0, nightsBetween(today(), this.stay().checkIn.date)));

  /** The revealed PIN; dropped when another stay is shown. */
  protected readonly code = linkedSignal<string, DoorCode | null>({ source: () => this.stay().bookingId, computation: () => null });
  protected readonly revealing = signal(false);
  protected readonly unlock = signal<UnlockState>('idle');
  protected readonly unlockLabel = computed(() => (this.unlock() === 'relocked' ? 'idle' : this.unlock()));

  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  /** Fetches the PIN only on tap; tapping again hides it. */
  protected toggleCode(): void {
    if (this.code()) {
      this.code.set(null);
      return;
    }
    this.revealing.set(true);
    this.bookingsApi.revealCode(this.stay().bookingId).subscribe({
      next: (code) => {
        this.revealing.set(false);
        this.code.set(code);
      },
      error: (err: unknown) => {
        this.revealing.set(false);
        this.toast.apiError(err);
      },
    });
  }

  /** Remote unlock through the lock provider; the door relocks by itself. */
  protected open(): void {
    if (this.unlock() === 'busy') return;
    clearTimeout(this.timer);
    this.unlock.set('busy');
    this.bookingsApi.unlock(this.stay().bookingId).subscribe({
      next: ({ opened }) => {
        if (!opened) {
          this.unlock.set('idle');
          this.toast.error('account.stay.unlock.failed');
          return;
        }
        this.unlock.set('open');
        this.toast.success('account.stay.unlock.toast');
        this.timer = setTimeout(() => this.unlock.set('relocked'), AUTO_RELOCK_MS);
      },
      error: (err: unknown) => {
        this.unlock.set('idle');
        this.toast.apiError(err);
      },
    });
  }
}
