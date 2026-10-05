import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MeApi } from '@api/endpoints/me.api';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';

/** Saudi mobile: `05XXXXXXXX`, `5XXXXXXXX` or `+9665XXXXXXXX` (the API normalises it). */
const MOBILE_PATTERN = /^(?:\+?966|0)?5\d{8}$/;
const OTP_PATTERN = /^\d{4,6}$/;

/** Changes the account's mobile number: a code is sent to the new number, then confirmed. */
@Component({
  selector: 'app-mobile-change-dialog',
  imports: [TranslatePipe, FieldComponent, ModalComponent],
  template: `
    <app-modal size="sm" [title]="'account.mobile.title' | translate" (closed)="closed.emit()">
      @if (step() === 'number') {
        <app-field [label]="'account.mobile.newNumber' | translate" for="mb-new" [help]="'account.mobile.help' | translate">
          <input
            id="mb-new"
            class="input ltr"
            inputmode="tel"
            autocomplete="tel"
            [value]="mobile()"
            (input)="mobile.set(compact($any($event.target).value))"
            (keydown.enter)="request()"
          />
        </app-field>
      } @else {
        <p class="small muted mb-8">{{ 'account.mobile.codeSent' | translate: { mobile: mobile() } }}</p>
        <app-field [label]="'account.mobile.code' | translate" for="mb-code">
          <input id="mb-code" class="input ltr" inputmode="numeric" autocomplete="one-time-code" [value]="code()" (input)="code.set($any($event.target).value.trim())" (keydown.enter)="confirm()" />
        </app-field>
        @if (devCode(); as dev) {
          <p class="xs muted mt-8">{{ 'guest.login.demoCode' | translate }} <b class="ltr">{{ dev }}</b></p>
        }
      }
      <ng-container modal-footer>
        @if (step() === 'number') {
          <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="request()">{{ 'account.mobile.sendCode' | translate }}</button>
        } @else {
          <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="confirm()">{{ 'account.mobile.confirm' | translate }}</button>
          <button type="button" class="btn btn-ghost" [disabled]="busy()" (click)="step.set('number')">{{ 'guest.login.edit' | translate }}</button>
        }
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileChangeDialogComponent {
  private readonly meApi = inject(MeApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly closed = output<void>();

  protected readonly step = signal<'number' | 'code'>('number');
  protected readonly mobile = signal('');
  protected readonly code = signal('');
  /** Code returned by development backends, shown as a hint. */
  protected readonly devCode = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected compact(value: string): string {
    return value.replace(/\s/g, '');
  }

  protected request(): void {
    if (!MOBILE_PATTERN.test(this.mobile())) {
      this.toast.error('guest.login.errors.phone');
      return;
    }
    this.busy.set(true);
    this.meApi.requestMobileChange(this.mobile()).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.devCode.set(res.devCode ?? null);
        this.step.set('code');
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }

  protected confirm(): void {
    if (!OTP_PATTERN.test(this.code())) {
      this.toast.error('guest.login.errors.incomplete');
      return;
    }
    this.busy.set(true);
    this.meApi.confirmMobileChange(this.mobile(), this.code()).subscribe({
      next: (user) => {
        this.busy.set(false);
        this.auth.setUser(user);
        this.toast.success('account.mobile.changed');
        this.closed.emit();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
