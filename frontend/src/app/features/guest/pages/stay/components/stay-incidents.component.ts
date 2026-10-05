import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Incident } from '@api/dto';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';

/** Issues the guest reported during this stay and how operations is handling them. */
@Component({
  selector: 'app-stay-incidents',
  imports: [TranslatePipe, AppDatePipe, EmptyStateComponent, IconComponent, StatusPillComponent],
  template: `
    <div class="rows" aria-live="polite">
      @for (i of incidents(); track i.id) {
        <div class="row between entry">
          <div class="row gap-12">
            <span class="li-ic" [class.green]="i.status === 'RESOLVED'" [class.red]="i.status !== 'RESOLVED'">
              <app-icon [name]="i.status === 'RESOLVED' ? 'check-circle-2' : 'triangle-alert'" size="sm" />
            </span>
            <div>
              <div class="b small">{{ 'domain.api.incidentCategory.' + i.category | translate }}</div>
              <div class="xs muted">{{ i.description }}</div>
              @if (i.resolution) {
                <div class="xs green mt-4">{{ i.resolution }}</div>
              }
            </div>
          </div>
          <div class="end-col">
            <div class="xs muted">{{ i.createdAt | appDate: 'dateTime' }}</div>
            <app-status-pill domain="incident" [code]="i.status" />
          </div>
        </div>
      } @empty {
        <app-empty-state icon="check-circle-2" [title]="'account.stay.incidentsEmpty' | translate" />
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .entry {
      padding: 10px 0;
    }
    .end-col {
      text-align: end;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StayIncidentsComponent {
  readonly incidents = input.required<readonly Incident[]>();
}
