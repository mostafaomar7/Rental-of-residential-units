import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { User } from '@api/dto';
import { AuthService } from '@core/services/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { ToastService, errorKey } from '@core/services/toast.service';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';

type Step = 'phone' | 'otp' | 'register';

/** Saudi mobile: `05XXXXXXXX`, `5XXXXXXXX` or `+9665XXXXXXXX` (the API normalises it). */
const MOBILE_PATTERN = /^(?:\+?966|0)?5\d{8}$/;
const MIN_NAME_LENGTH = 3;
const OTP_LENGTH = 4;
const DEFAULT_RESEND_SECONDS = 45;

/**
 * Guest sign-in / sign-up by mobile + OTP (SRS USR-01..04, UC-01). A number the API doesn't know
 * continues to a short registration step. Rendered while `AuthService.loginRequest()` is non-null.
 */
@Component({
  selector: 'app-login-dialog',
  imports: [TranslatePipe, RouterLink, FieldComponent, IconComponent, ModalComponent],
  templateUrl: './login-dialog.component.html',
  styles: `
    .phone-input {
      display: block;
    }
    /* Digits are typed LTR but stay aligned with the Arabic labels. */
    :host-context([dir='rtl']) .phone-input {
      text-align: right;
    }
    .otp-icon {
      margin: 0 auto;
      width: 56px;
      height: 56px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginDialogComponent {
  private readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly injector = inject(Injector);

  private readonly otpInputs = viewChildren<ElementRef<HTMLInputElement>>('otpInput');
  private timer: ReturnType<typeof setInterval> | undefined;
  private registrationToken = '';

  protected readonly otpSlots = Array.from({ length: OTP_LENGTH }, (_, i) => i);

  protected readonly step = signal<Step>('phone');
  protected readonly phone = signal('');
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly referral = signal('');
  /** Code returned by development backends, shown as a hint. */
  protected readonly devCode = signal<string | null>(null);
  protected readonly busy = signal(false);
  /** Translation key of the current error, or `''`. */
  protected readonly error = signal('');
  protected readonly phoneInvalid = signal(false);
  protected readonly secondsLeft = signal(0);
  protected readonly welcomePoints = computed(() => this.catalog.settings()?.loyalty.welcomePoints ?? 0);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopTimer());
  }

  protected close(): void {
    this.auth.cancelLogin();
  }

  protected editPhone(): void {
    this.step.set('phone');
    this.error.set('');
    this.stopTimer();
  }

  protected sendOtp(): void {
    const phone = this.phone().replace(/\s/g, '');
    if (!MOBILE_PATTERN.test(phone)) {
      this.error.set('guest.login.errors.phone');
      this.phoneInvalid.set(true);
      return;
    }
    this.phone.set(phone);
    this.phoneInvalid.set(false);
    this.requestCode(() => {
      this.step.set('otp');
      this.focusOtp(0);
    });
  }

  protected resendOtp(): void {
    this.requestCode(() => {
      this.toast.success('guest.login.resent');
      this.clearOtp();
      this.focusOtp(0);
    });
  }

  protected onOtpInput(index: number, input: HTMLInputElement): void {
    input.value = input.value.replace(/\D/g, '').slice(-1);
    const inputs = this.otpInputs();
    if (input.value && index < inputs.length - 1) inputs[index + 1].nativeElement.focus();
    if (inputs.every((i) => i.nativeElement.value)) this.verifyOtp();
  }

  protected onOtpBackspace(index: number, input: HTMLInputElement): void {
    if (!input.value && index > 0) this.otpInputs()[index - 1].nativeElement.focus();
  }

  protected fillDevCode(): void {
    const code = this.devCode();
    if (!code) return;
    this.otpInputs().forEach((input, i) => (input.nativeElement.value = code[i] ?? ''));
    this.verifyOtp();
  }

  protected verifyOtp(): void {
    if (this.busy()) return;
    const code = this.otpInputs()
      .map((i) => i.nativeElement.value)
      .join('');
    if (code.length < OTP_LENGTH) {
      this.error.set('guest.login.errors.incomplete');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.auth.verifyOtp(this.phone(), code).subscribe({
      next: (outcome) => {
        this.busy.set(false);
        this.stopTimer();
        if (outcome.kind === 'signed-in') {
          this.finish(outcome.user, false);
        } else {
          this.registrationToken = outcome.registrationToken;
          this.step.set('register');
        }
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(errorKey(err, this.translate));
        this.clearOtp();
        this.focusOtp(0);
      },
    });
  }

  protected register(): void {
    const fullName = this.name().trim();
    if (fullName.length < MIN_NAME_LENGTH) {
      this.error.set('guest.login.errors.name');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.auth
      .register({
        registrationToken: this.registrationToken,
        fullName,
        email: this.email().trim() || null,
        referralCode: this.referral().trim() || null,
      })
      .subscribe({
        next: (user) => {
          this.busy.set(false);
          this.finish(user, true);
        },
        error: (err: unknown) => {
          this.busy.set(false);
          this.error.set(errorKey(err, this.translate));
        },
      });
  }

  private finish(user: User, isNew: boolean): void {
    const firstName = user.fullName.split(' ')[0];
    if (isNew) this.toast.success('guest.login.welcomeNew', { name: firstName, points: this.welcomePoints() });
    else this.toast.success('guest.login.welcomeBack', { name: firstName });
    // Staff who sign in from the website land in their own portal.
    this.auth.completeLogin(user, user.role === 'GUEST' ? '' : this.auth.homeFor(user.role));
  }

  private requestCode(onSent: () => void): void {
    this.busy.set(true);
    this.error.set('');
    this.auth.requestOtp(this.phone()).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.devCode.set(res.devCode ?? null);
        this.startTimer(res.resendAfterSeconds || DEFAULT_RESEND_SECONDS);
        onSent();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(errorKey(err, this.translate));
      },
    });
  }

  private startTimer(seconds: number): void {
    this.stopTimer();
    this.secondsLeft.set(seconds);
    this.timer = setInterval(() => {
      const left = this.secondsLeft() - 1;
      this.secondsLeft.set(left);
      if (left <= 0) this.stopTimer();
    }, 1000);
  }

  private stopTimer(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  private clearOtp(): void {
    this.otpInputs().forEach((i) => (i.nativeElement.value = ''));
  }

  private focusOtp(index: number): void {
    afterNextRender(() => this.otpInputs()[index]?.nativeElement.focus(), { injector: this.injector });
  }
}
