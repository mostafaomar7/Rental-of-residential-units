import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Booking } from '@api/dto';
import { LangService } from '@core/services/lang.service';
import { ToastService } from '@core/services/toast.service';
import { saveBlob } from '@core/utils/download.utils';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { localize } from '@shared/pipes/localize.pipe';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';

const INSTRUCTIONS = ['keyOnStayPage', 'dontShare', 'locationBefore', 'help'].map((k) => `account.booking.done.instructions.${k}`);

/** `YYYYMMDDTHHmm00` (local time) for an iCalendar entry. */
const icsStamp = (date: string, time: string): string => `${date.replace(/-/g, '')}T${time.replace(':', '').slice(0, 4)}00`;

/** Step 5 — confirmation with the booking number, key activation time and next steps (SRS BKG-02, ACC). */
@Component({
  selector: 'app-confirmation-step',
  imports: [RouterLink, TranslatePipe, AppDatePipe, IconComponent, StatusPillComponent],
  template: `
    @let b = booking();
    <div class="center">
      <div class="li-ic green big-ic"><app-icon name="check-circle-2" size="xl" /></div>
      <h2 class="h2 mt-12">{{ 'account.booking.done.title' | translate }}</h2>
      <p class="muted mt-4 row centered">
        {{ 'account.booking.done.number' | translate }} <b class="navy ltr">{{ b.number }}</b>
        <app-status-pill domain="booking" [code]="b.status" />
      </p>
    </div>

    <div class="key-card mt-24">
      <span class="row b small gold"><app-icon name="key-round" size="sm" />{{ 'account.booking.done.digitalKey' | translate }}</span>
      <div class="glass mt-16 small row centered">
        <app-icon name="clock" size="sm" />
        {{
          'account.key.validRange'
            | translate
              : {
                  from: (b.checkIn | appDate: 'medium'),
                  fromTime: (b.checkInTime | appDate: 'time'),
                  to: (b.checkOut | appDate: 'medium'),
                  toTime: (b.checkOutTime | appDate: 'time'),
                }
        }}
      </div>
    </div>

    <div class="soft-lg mt-16">
      <div class="bb mb-8">{{ 'account.booking.done.instructionsTitle' | translate }}</div>
      @for (step of instructions; track step; let i = $index) {
        <div class="row-top small mt-4 bullet">
          <span class="pill pill-navy">{{ i + 1 }}</span><span class="lh">{{ step | translate }}</span>
        </div>
      }
    </div>

    <div class="row wrap mt-24">
      <button type="button" class="btn btn-primary" (click)="addToCalendar()">
        <app-icon name="calendar-plus" size="sm" />{{ 'account.booking.done.addToCalendar' | translate }}
      </button>
      <a class="btn btn-ghost" routerLink="/account/bookings">{{ 'account.booking.done.myBookings' | translate }}</a>
      <a class="btn btn-ghost" [routerLink]="['/invoice', b.id]"><app-icon name="receipt" size="sm" />{{ 'account.booking.done.invoice' | translate }}</a>
      <a class="btn btn-ghost" [routerLink]="['/stay', b.id]">{{ 'account.booking.done.stayPage' | translate }}</a>
    </div>
  `,
  styles: `
    .big-ic {
      width: 72px;
      height: 72px;
      margin: 0 auto;
    }
    .centered {
      justify-content: center;
    }
    .bullet {
      gap: 8px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationStepComponent {
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LangService);

  readonly booking = input.required<Booking>();

  protected readonly instructions = INSTRUCTIONS;

  /** Downloads an `.ics` calendar entry for the stay. */
  protected addToCalendar(): void {
    const b = this.booking();
    const lang = this.lang.lang();
    const t = (key: string, params?: Record<string, unknown>): string => this.translate.instant(key, params);
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Rawaaf//Guest//AR',
      'BEGIN:VEVENT',
      `UID:${b.id}@rawaaf.sa`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `DTSTART:${icsStamp(b.checkIn, b.checkInTime)}`,
      `DTEND:${icsStamp(b.checkOut, b.checkOutTime)}`,
      `SUMMARY:${t('account.calendar.summary', { title: localize(b.property, 'name', lang) })}`,
      `DESCRIPTION:${t('account.calendar.description', { id: b.number })}`,
      `LOCATION:${localize(b.property.city, 'name', lang)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    saveBlob(new Blob([ics], { type: 'text/calendar' }), `rawaaf-${b.number}.ics`);
    this.toast.success('account.booking.done.calendarDownloaded');
  }
}
