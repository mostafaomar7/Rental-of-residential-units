import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { Incident, IncidentCategory, IncidentSeverity } from '@api/dto';
import { BookingsApi } from '@api/endpoints/bookings.api';
import { ToastService } from '@core/services/toast.service';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';

/** Guest-facing incident categories with their icons. */
const CATEGORIES: readonly { id: IncidentCategory; icon: string }[] = [
  { id: 'MAINTENANCE', icon: 'wrench' },
  { id: 'CLEANLINESS', icon: 'sparkles' },
  { id: 'LOCK', icon: 'key-round' },
  { id: 'INTERNET', icon: 'wifi' },
  { id: 'NOISE', icon: 'volume-2' },
  { id: 'SAFETY', icon: 'siren' },
  { id: 'DAMAGE', icon: 'shield-alert' },
  { id: 'OTHER', icon: 'ellipsis' },
];
const SEVERITIES: readonly IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH'];

/** Guest issue report → operations incident (SRS STY, OPS), then a receipt. */
@Component({
  selector: 'app-report-issue-dialog',
  imports: [TranslatePipe, FieldComponent, IconComponent, ModalComponent],
  template: `
    @if (receipt(); as r) {
      <app-modal size="sm" [title]="'account.stay.issue.receivedTitle' | translate" (closed)="closed.emit()">
        <div class="center">
          <div class="li-ic green big-ic"><app-icon name="check-circle-2" size="lg" /></div>
          <div class="h3 mt-12">{{ 'domain.api.incidentCategory.' + r.category | translate }}</div>
          <p class="small muted mt-8 lh">{{ 'account.stay.issue.receivedBody' | translate }}</p>
        </div>
        <ng-container modal-footer>
          <button type="button" class="btn btn-primary" (click)="closed.emit()">{{ 'account.stay.issue.ok' | translate }}</button>
        </ng-container>
      </app-modal>
    } @else {
      <app-modal size="lg" [title]="'account.stay.issue.title' | translate" [subtitle]="'account.stay.issue.subtitle' | translate" (closed)="closed.emit()">
        <div class="field">
          <span class="lbl">{{ 'account.stay.issue.category' | translate }}</span>
          <div class="chips">
            @for (c of categories; track c.id) {
              <button type="button" class="chip chip-sm" [class.on]="category() === c.id" [attr.aria-pressed]="category() === c.id" (click)="category.set(c.id)">
                <app-icon [name]="c.icon" size="sm" />{{ 'domain.api.incidentCategory.' + c.id | translate }}
              </button>
            }
          </div>
        </div>
        <div class="field mt-16">
          <span class="lbl">{{ 'account.stay.issue.severity' | translate }}</span>
          <div class="chips">
            @for (s of severities; track s) {
              <button type="button" class="chip chip-sm" [class.on]="severity() === s" [attr.aria-pressed]="severity() === s" (click)="severity.set(s)">
                {{ 'status.severity.' + s | translate }}
              </button>
            }
          </div>
        </div>
        <div class="mt-16">
          <app-field [label]="'account.stay.issue.description' | translate" for="is-d">
            <textarea
              id="is-d"
              class="textarea"
              [placeholder]="'account.stay.issue.placeholder' | translate"
              [value]="description()"
              (input)="description.set($any($event.target).value)"
            ></textarea>
          </app-field>
        </div>
        <ng-container modal-footer>
          <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="submit()">{{ 'account.stay.issue.submit' | translate }}</button>
          <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
        </ng-container>
      </app-modal>
    }
  `,
  styles: `
    .big-ic {
      width: 64px;
      height: 64px;
      margin: 0 auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportIssueDialogComponent {
  private readonly bookingsApi = inject(BookingsApi);
  private readonly toast = inject(ToastService);

  readonly bookingId = input.required<Uuid>();
  readonly closed = output<void>();
  readonly reported = output<Incident>();

  protected readonly categories = CATEGORIES;
  protected readonly severities = SEVERITIES;

  protected readonly category = signal<IncidentCategory>('MAINTENANCE');
  protected readonly severity = signal<IncidentSeverity>('MEDIUM');
  protected readonly description = signal('');
  protected readonly busy = signal(false);
  protected readonly receipt = signal<Incident | null>(null);

  protected submit(): void {
    const description = this.description().trim();
    if (!description) {
      this.toast.error('account.stay.issue.descriptionRequired');
      return;
    }
    this.busy.set(true);
    this.bookingsApi.reportIncident(this.bookingId(), { category: this.category(), severity: this.severity(), description }).subscribe({
      next: (incident) => {
        this.busy.set(false);
        this.receipt.set(incident);
        this.reported.emit(incident);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
