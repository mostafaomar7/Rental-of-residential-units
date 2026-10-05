import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, switchMap, takeWhile, timer } from 'rxjs';
import { NafathRequest, NafathStatus } from '@api/dto';
import { MeApi } from '@api/endpoints/me.api';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';

type NafathStep = 'id' | 'waiting' | 'verified' | 'failed';

/** Saudi national ID (starts with 1) or Iqama (starts with 2). */
const ID_PATTERN = /^[12]\d{9}$/;
const POLL_MS = 3000;
const SUCCESS_DELAY_MS = 1100;

/**
 * Nafath identity verification (SRS USR-05): the guest enters their ID, picks the shown number in
 * the Nafath app, and the request is polled every 3 s until it completes. Emits `verified` after
 * the success screen (the cached profile is refreshed first).
 */
@Component({
  selector: 'app-nafath-dialog',
  imports: [TranslatePipe, FieldComponent, IconComponent, ModalComponent],
  template: `
    <app-modal size="sm" sticky [title]="'account.nafath.title' | translate" [subtitle]="'account.nafath.subtitle' | translate" (closed)="closed.emit()">
      @switch (step()) {
        @case ('id') {
          <form (submit)="$event.preventDefault(); start()">
            <app-field [label]="'account.nafath.idLabel' | translate" for="nf-id" [help]="'account.nafath.idHelp' | translate" [error]="idError() ? ('account.nafath.idInvalid' | translate) : ''">
              <input
                id="nf-id"
                class="input ltr d-block"
                inputmode="numeric"
                maxlength="10"
                autocomplete="off"
                [value]="idNumber()"
                (input)="idNumber.set($any($event.target).value.trim())"
              />
            </app-field>
          </form>
        }
        @case ('waiting') {
          <div class="center">
            <p class="small lh" [innerHTML]="'account.nafath.instructions' | translate"></p>
            <div class="nafath-num">{{ request()?.random }}</div>
            <div class="row small muted waiting">
              <span class="spin dark"></span>{{ 'account.nafath.waiting' | translate }} <b>{{ secondsLeft() }}</b> {{ 'account.nafath.secondsShort' | translate }}
            </div>
          </div>
        }
        @case ('verified') {
          <div class="center verified">
            <div class="li-ic green big-ic"><app-icon name="badge-check" size="xl" /></div>
            <h3 class="h3 mt-12">{{ 'account.nafath.verifiedTitle' | translate }}</h3>
            <p class="small muted mt-4">{{ 'account.nafath.verifiedSub' | translate }}</p>
          </div>
        }
        @case ('failed') {
          <div class="center verified">
            <div class="li-ic red big-ic"><app-icon name="timer-off" size="xl" /></div>
            <h3 class="h3 mt-12">{{ 'account.nafath.failedTitle.' + failure() | translate }}</h3>
            <p class="small muted mt-4">{{ 'account.nafath.failedSub' | translate }}</p>
          </div>
        }
      }
      <ng-container modal-footer>
        @switch (step()) {
          @case ('id') {
            <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="start()">
              <app-icon name="fingerprint-pattern" size="sm" />{{ 'account.nafath.send' | translate }}
            </button>
            <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
          }
          @case ('waiting') {
            <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
          }
          @case ('failed') {
            <button type="button" class="btn btn-primary" (click)="retry()">{{ 'account.nafath.retry' | translate }}</button>
          }
        }
      </ng-container>
    </app-modal>
  `,
  styles: `
    .waiting {
      justify-content: center;
    }
    .verified {
      padding: 16px 0;
    }
    .big-ic {
      width: 72px;
      height: 72px;
      margin: 0 auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NafathDialogComponent {
  private readonly meApi = inject(MeApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly verified = output<void>();
  readonly closed = output<void>();

  protected readonly step = signal<NafathStep>('id');
  protected readonly idNumber = signal('');
  protected readonly idError = signal(false);
  protected readonly busy = signal(false);
  protected readonly request = signal<NafathRequest | null>(null);
  /** `REJECTED` / `EXPIRED` / `FAILED`, picks the failure title. */
  protected readonly failure = signal<Exclude<NafathStatus, 'WAITING' | 'COMPLETED'>>('EXPIRED');
  private readonly now = signal(Date.now());

  protected readonly secondsLeft = computed(() => {
    const expiresAt = this.request()?.expiresAt;
    return expiresAt ? Math.max(0, Math.round((Date.parse(expiresAt) - this.now()) / 1000)) : 0;
  });

  private polling?: Subscription;
  private clock?: ReturnType<typeof setInterval>;
  private successTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  protected start(): void {
    const idNumber = this.idNumber();
    if (!ID_PATTERN.test(idNumber)) {
      this.idError.set(true);
      return;
    }
    this.idError.set(false);
    this.busy.set(true);
    this.meApi.startNafath(idNumber).subscribe({
      next: (request) => {
        this.busy.set(false);
        this.request.set(request);
        this.step.set('waiting');
        this.poll(request);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }

  protected retry(): void {
    this.stop();
    this.request.set(null);
    this.step.set('id');
  }

  private poll(request: NafathRequest): void {
    this.stop();
    this.clock = setInterval(() => this.now.set(Date.now()), 1000);
    this.polling = timer(POLL_MS, POLL_MS)
      .pipe(
        switchMap(() => this.meApi.nafathStatus(request.id)),
        takeWhile((r) => r.status === 'WAITING', true),
      )
      .subscribe({
        next: (r) => this.onStatus(r),
        error: (err: unknown) => {
          this.stop();
          this.toast.apiError(err);
          this.step.set('id');
        },
      });
  }

  private onStatus(request: NafathRequest): void {
    this.request.set(request);
    if (request.status === 'WAITING') return;
    this.stop();
    if (request.status !== 'COMPLETED') {
      this.failure.set(request.status);
      this.step.set('failed');
      return;
    }
    this.step.set('verified');
    // Picks up `nafathVerified` (and the verified name) for the rest of the app.
    this.meApi.profile().subscribe({ next: (user) => this.auth.setUser(user), error: () => undefined });
    this.successTimer = setTimeout(() => this.verified.emit(), SUCCESS_DELAY_MS);
  }

  private stop(): void {
    this.polling?.unsubscribe();
    clearInterval(this.clock);
    clearTimeout(this.successTimer);
  }
}
