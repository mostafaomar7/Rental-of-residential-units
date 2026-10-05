import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { NafathDialogComponent } from '../../../components/nafath-dialog/nafath-dialog.component';
import { BookingDraft } from '../booking-draft';
import { StepNavComponent } from './step-nav.component';

/** Saudi mobile: `05XXXXXXXX`, `5XXXXXXXX` or `+9665XXXXXXXX` (the API normalises it). */
const MOBILE_PATTERN = /^(?:\+?966|0)?5\d{8}$/;
const MAX_REQUESTS_LENGTH = 500;

/** Step 2 — main guest details, special requests and, when the platform requires it, Nafath (SRS BKG-02, USR-05). */
@Component({
  selector: 'app-guest-step',
  imports: [TranslatePipe, FieldComponent, IconComponent, NafathDialogComponent, StepNavComponent],
  template: `
    @let d = draft();
    @let verified = auth.user()?.nafathVerified;
    <h2 class="h3">{{ 'account.booking.guest.title' | translate }}</h2>
    <div class="grid g2 mt-16">
      <app-field [label]="'account.booking.guest.fullName' | translate" for="bk-name">
        <input id="bk-name" class="input" autocomplete="name" [value]="d.guestName" (input)="patch.emit({ guestName: $any($event.target).value })" />
      </app-field>
      <app-field [label]="'account.booking.guest.phone' | translate" for="bk-phone">
        <input id="bk-phone" class="input ltr" inputmode="tel" autocomplete="tel" [value]="d.guestMobile" (input)="patch.emit({ guestMobile: $any($event.target).value })" />
      </app-field>
    </div>
    <div class="mt-16">
      <app-field [label]="'account.booking.guest.requests' | translate" for="bk-req" [help]="'account.booking.guest.requestsHelp' | translate">
        <textarea
          id="bk-req"
          class="textarea"
          [attr.maxlength]="maxRequests"
          [value]="d.specialRequests"
          (input)="patch.emit({ specialRequests: $any($event.target).value })"
        ></textarea>
      </app-field>
    </div>

    <h3 class="bb mt-24">{{ 'account.booking.guest.verifyTitle' | translate }}</h3>
    <p class="small muted mt-4 lh">{{ 'account.booking.guest.verifyHint' | translate }}</p>
    @if (verified) {
      <div class="notice green mt-12">
        <app-icon name="badge-check" />
        <div>
          <b>{{ 'account.booking.guest.verified' | translate }}</b>
        </div>
      </div>
    } @else {
      <div class="soft-lg mt-12 row between wrap">
        <div class="row">
          <span class="pm-logo nafath-logo">{{ 'account.nafath.logo' | translate }}</span>
          <div>
            <div class="b">{{ 'account.nafath.subtitle' | translate }}</div>
            <div class="xs muted">{{ (nafathRequired() ? 'account.booking.guest.nafathRequiredHint' : 'account.booking.guest.nafathLaterHint') | translate }}</div>
          </div>
        </div>
        <button type="button" class="btn btn-primary" (click)="verifying.set(true)">
          <app-icon name="fingerprint-pattern" size="sm" />{{ 'account.booking.guest.verifyButton' | translate }}
        </button>
      </div>
    }

    <app-step-nav [blockedMessage]="nafathRequired() && !verified ? 'account.booking.errors.nafathRequired' : null" (back)="back.emit()" (next)="onNext()" />

    @if (verifying()) {
      <app-nafath-dialog (verified)="onVerified()" (closed)="verifying.set(false)" />
    }
  `,
  styles: `
    .nafath-logo {
      background: #0f8a5f;
      color: #fff;
      width: 52px;
      height: 40px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestStepComponent {
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  readonly draft = input.required<BookingDraft>();
  /** Nafath must be completed before booking (platform setting or a `NAFATH_REQUIRED` answer). */
  readonly nafathRequired = input(false);

  readonly patch = output<Partial<BookingDraft>>();
  readonly back = output<void>();
  readonly next = output<void>();

  protected readonly maxRequests = MAX_REQUESTS_LENGTH;
  protected readonly verifying = signal(false);

  protected onVerified(): void {
    this.verifying.set(false);
    this.toast.success('account.nafath.done');
  }

  protected onNext(): void {
    const { guestName, guestMobile } = this.draft();
    if (!guestName.trim()) {
      this.toast.error('account.errors.nameRequired');
      return;
    }
    if (!MOBILE_PATTERN.test(guestMobile.replace(/\s/g, ''))) {
      this.toast.error('account.errors.phoneInvalid');
      return;
    }
    this.next.emit();
  }
}
