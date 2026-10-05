import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { FieldApi } from '@api/endpoints/field.api';
import { AuthSrcDirective } from '@shared/directives/auth-src.directive';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { AppDatePipe, SarPipe } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { SupervisorShellComponent } from '../../../components/field-shells.component';
import { LoadStateComponent } from '../../../components/load-state.component';
import { ReportIssueModalComponent, ReportKind } from '../../../components/report-issue-modal.component';

/** Damage cases shown; the field app lists the latest ones only. */
const DAMAGE_PAGE_SIZE = 50;

/** `/supervisor/reports` — damage cases on the supervisor's properties, and filing a new report. */
@Component({
  selector: 'app-supervisor-reports-page',
  imports: [
    TranslatePipe,
    AppDatePipe,
    SarPipe,
    LocalizePipe,
    AuthSrcDirective,
    IconComponent,
    EmptyStateComponent,
    StatusPillComponent,
    SupervisorShellComponent,
    LoadStateComponent,
    ReportIssueModalComponent,
  ],
  template: `
    <app-supervisor-shell [title]="'field.supervisor.reports.title' | translate" [subtitle]="'field.supervisor.reports.subtitle' | translate">
      <button type="button" class="btn btn-danger btn-block" (click)="reporting.set(true)">
        <app-icon name="triangle-alert" size="sm" />{{ 'field.supervisor.reports.newReport' | translate }}
      </button>

      <h3 class="bb mt-16">{{ 'field.supervisor.reports.damages' | translate }}</h3>
      @if (damages.error() || !damages.hasValue()) {
        <app-load-state [error]="damages.error()" (retry)="damages.reload()" />
      } @else {
        @for (d of damages.value().items; track d.id) {
          <div class="task-card mt-8">
            <div class="row between">
              <span class="b small">{{ d.number }} • {{ d.property | loc }}</span>
              <app-status-pill domain="damage" [code]="d.status" />
            </div>
            <div class="small mt-4">{{ d.description }}</div>
            <div class="xs muted mt-4">
              {{ 'field.supervisor.reports.booking' | translate: { number: d.booking.number, guest: d.booking.guestName } }} •
              {{ d.createdAt | appDate: 'short' }} • {{ d.amountClaimed | sar }}
            </div>
            @if (d.photos.length) {
              <div class="thumbs-row mt-8">
                @for (p of d.photos; track p.id) {
                  <img [authSrc]="p.thumbUrl" alt="" />
                }
              </div>
            }
          </div>
        } @empty {
          <div class="card mt-8">
            <app-empty-state icon="shield-check" [title]="'field.supervisor.reports.noDamages' | translate" />
          </div>
        }
      }

      @if (reporting()) {
        <app-report-issue-modal (reported)="onReported($event)" (closed)="reporting.set(false)" />
      }
    </app-supervisor-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupervisorReportsPage {
  private readonly api = inject(FieldApi);

  protected readonly damages = rxResource({ stream: () => this.api.damageCases({ limit: DAMAGE_PAGE_SIZE }) });
  protected readonly reporting = signal(false);

  protected onReported(kind: ReportKind): void {
    if (kind === 'damage') this.damages.reload();
  }
}
