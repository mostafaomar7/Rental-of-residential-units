import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { IntegrationCall } from '@api/dto';
import { AdminConfigApi } from '@api/endpoints/admin-config.api';
import { ToastService } from '@core/services/toast.service';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { KvComponent } from '@shared/ui/kv/kv.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { ResourceStateComponent } from '../../components/resource-state.component';

/** Statuses a call can be retried from. */
export const RETRYABLE_CALL: readonly IntegrationCall['status'][] = ['FAILED', 'DEAD'];

/** One outbound integration call: payload, response and every attempt, with a manual retry. */
@Component({
  selector: 'app-integration-call-modal',
  imports: [JsonPipe, TranslatePipe, FORMAT_PIPES, ModalComponent, KvComponent, IconComponent, StatusPillComponent, ResourceStateComponent],
  template: `
    <app-modal size="lg" [title]="'admin.integrations.call.title' | translate" (closed)="closed.emit()">
      <app-resource-state [resource]="call" />
      @if (call.hasValue()) {
        @let c = call.value();
        <div class="grid g2">
          <div>
            <app-kv [label]="'admin.integrations.cols.provider' | translate">{{ 'domain.integrations.' + c.provider.toLowerCase() + '.name' | translate }}</app-kv>
            <app-kv [label]="'admin.integrations.cols.operation' | translate"><span class="kbd">{{ c.operation }}</span></app-kv>
            <app-kv [label]="'admin.integrations.cols.entity' | translate"><span class="ltr small">{{ c.entityType }} / {{ c.entityId }}</span></app-kv>
            <app-kv [label]="'admin.integrations.cols.status' | translate"><app-status-pill domain="integrationCall" [code]="c.status" /></app-kv>
          </div>
          <div>
            <app-kv [label]="'admin.integrations.cols.attempts' | translate">{{ c.attempts }} / {{ c.maxAttempts }}</app-kv>
            <app-kv [label]="'admin.integrations.cols.created' | translate">{{ c.createdAt | appDate: 'dateTime' }}</app-kv>
            <app-kv [label]="'admin.integrations.call.nextAttempt' | translate">{{ c.nextAttemptAt ? (c.nextAttemptAt | appDate: 'dateTime') : ('common.none' | translate) }}</app-kv>
            <app-kv [label]="'admin.integrations.call.externalRef' | translate"><span class="ltr">{{ c.externalRef || ('common.none' | translate) }}</span></app-kv>
          </div>
        </div>

        @if (c.lastError) {
          <div class="notice red small mt-12">
            <app-icon name="alert-circle" />
            <div class="ltr">{{ c.lastError }}</div>
          </div>
        }

        <div class="grid g2 mt-16">
          <div>
            <div class="bb mb-8">{{ 'admin.integrations.call.payload' | translate }}</div>
            <pre class="code">{{ c.payload | json }}</pre>
          </div>
          <div>
            <div class="bb mb-8">{{ 'admin.integrations.call.response' | translate }}</div>
            <pre class="code">{{ c.response | json }}</pre>
          </div>
        </div>

        <div class="bb mb-8 mt-16">{{ 'admin.integrations.call.attempts' | translate }}</div>
        @if (c.attemptsLog?.length) {
          <div class="tbl-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{{ 'admin.integrations.call.at' | translate }}</th>
                  <th>{{ 'admin.integrations.call.result' | translate }}</th>
                  <th>{{ 'admin.integrations.avgDuration' | translate }}</th>
                  <th>{{ 'admin.integrations.call.error' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (a of c.attemptsLog; track a.number) {
                  <tr>
                    <td>{{ a.number }}</td>
                    <td class="small nowrap">{{ a.at | appDate: 'dateTime' }}</td>
                    <td>
                      <span class="pill" [class]="a.ok ? 'pill-green' : 'pill-red'">{{ (a.ok ? 'admin.integrations.call.ok' : 'admin.integrations.call.failed') | translate }}</span>
                    </td>
                    <td class="small">{{ 'admin.integrations.ms' | translate: { value: (a.durationMs | num: 0) } }}</td>
                    <td class="small ltr">{{ a.error || ('common.none' | translate) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="small muted">{{ 'admin.integrations.call.noAttempts' | translate }}</p>
        }
      }
      <ng-container modal-footer>
        @if (call.hasValue() && retryable.includes(call.value().status)) {
          <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="retry()"><app-icon name="rotate-cw" size="sm" />{{ 'admin.integrations.retry' | translate }}</button>
        }
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.close' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  styles: `
    pre.code {
      max-height: 260px;
      margin: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntegrationCallModalComponent {
  private readonly api = inject(AdminConfigApi);
  private readonly toast = inject(ToastService);

  readonly callId = input.required<Uuid>();
  readonly retried = output<void>();
  readonly closed = output<void>();

  protected readonly retryable = RETRYABLE_CALL;
  protected readonly call = rxResource({ params: () => this.callId(), stream: ({ params }) => this.api.integrationCall(params) });
  protected readonly busy = signal(false);

  protected retry(): void {
    this.busy.set(true);
    this.api.retryIntegrationCall(this.callId()).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('admin.integrations.retried');
        this.call.reload();
        this.retried.emit();
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
