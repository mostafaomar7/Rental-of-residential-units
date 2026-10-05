import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IntegrationHealth, IntegrationProvider } from '@api/dto';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';

interface IntegrationLogo {
  background: string;
  color: string;
}

const LOGOS: Record<IntegrationProvider, IntegrationLogo> = {
  SHOMOOS: { background: '#0F4C81', color: '#fff' },
  NAFATH: { background: '#0F8A5F', color: '#fff' },
  EWAA: { background: '#7A3E9D', color: '#fff' },
};
const FALLBACK_LOGO: IntegrationLogo = { background: '#0A1931', color: '#C9A86A' };

/** Health card of one government integration: status, queue, last 24 hours and the last error. */
@Component({
  selector: 'app-integration-card',
  imports: [TranslatePipe, FORMAT_PIPES, IconComponent, StatusPillComponent],
  template: `
    @let x = integration();
    <div class="card card-p int-card">
      <div class="row gap-12">
        <span class="int-logo" [style.background]="logo().background" [style.color]="logo().color">{{ 'admin.integrations.logo.' + key() | translate }}</span>
        <div class="grow">
          <div class="bb">{{ 'domain.integrations.' + key() + '.name' | translate }}</div>
          <div class="xs muted">{{ 'domain.integrations.' + key() + '.desc' | translate }}</div>
        </div>
      </div>

      <div class="row between">
        <app-status-pill domain="integrationHealth" [code]="x.status" />
        <span class="xs muted">{{ 'admin.integrations.driver' | translate }} <span class="kbd">{{ x.driver }}</span></span>
      </div>

      <div class="grid g3 stats">
        <div class="soft">
          <div class="xs muted b">{{ 'admin.integrations.succeeded24h' | translate }}</div>
          <div class="bb green">{{ x.last24h.succeeded | num }}</div>
        </div>
        <div class="soft">
          <div class="xs muted b">{{ 'admin.integrations.failed24h' | translate }}</div>
          <div class="bb" [class.red]="x.last24h.failed > 0">{{ x.last24h.failed | num }}</div>
        </div>
        <div class="soft">
          <div class="xs muted b">{{ 'admin.integrations.avgDuration' | translate }}</div>
          <div class="bb">
            @if (x.last24h.avgDurationMs !== null) {
              {{ 'admin.integrations.ms' | translate: { value: (x.last24h.avgDurationMs | num: 0) } }}
            } @else {
              —
            }
          </div>
        </div>
      </div>

      <div class="xs muted">
        {{ 'admin.integrations.queue' | translate: { pending: x.queue.pending, running: x.queue.running, dead: x.queue.dead } }}
      </div>
      <div class="xs muted">
        {{ 'admin.integrations.lastSuccess' | translate: { time: x.lastSuccessAt ? (x.lastSuccessAt | appDate: 'dateTime') : ('common.none' | translate) } }}
      </div>

      @if (x.lastError) {
        <div>
          <div class="xs b red mb-8">{{ 'admin.integrations.lastError' | translate: { time: x.lastFailureAt ? (x.lastFailureAt | appDate: 'dateTime') : ('common.none' | translate) } }}</div>
          <div class="code err">{{ x.lastError }}</div>
        </div>
      } @else {
        <div class="notice green xs">
          <app-icon name="check" size="sm" />
          <div>{{ 'admin.integrations.noErrors' | translate }}</div>
        </div>
      }

      <div class="row wrap">
        <button type="button" class="btn btn-ghost btn-xs" (click)="showCalls.emit(false)">{{ 'admin.integrations.viewCalls' | translate }}</button>
        @if (x.queue.dead || x.last24h.failed) {
          <button type="button" class="btn btn-danger btn-xs" (click)="showCalls.emit(true)">{{ 'admin.integrations.viewFailed' | translate }}</button>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .int-card {
      height: 100%;
    }
    .stats {
      gap: 8px;
    }
    .err {
      font-size: 11px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntegrationCardComponent {
  readonly integration = input.required<IntegrationHealth>();
  /** Open the calls log for this provider; `true` = failed calls only. */
  readonly showCalls = output<boolean>();

  /** Lower-case provider id used by the `domain.integrations.*` labels. */
  protected readonly key = computed(() => this.integration().provider.toLowerCase());
  protected readonly logo = computed(() => LOGOS[this.integration().provider] ?? FALLBACK_LOGO);
}
