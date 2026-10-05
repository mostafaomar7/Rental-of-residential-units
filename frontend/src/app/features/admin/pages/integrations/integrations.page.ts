import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { IntegrationCall, IntegrationCallStatus, IntegrationProvider } from '@api/dto';
import { AdminConfigApi } from '@api/endpoints/admin-config.api';
import { ToastService } from '@core/services/toast.service';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { AdminQueuesService } from '../../admin-queues.service';
import { IntegrationCardComponent } from '../../components/integration-card.component';
import { PagerComponent } from '../../components/pager.component';
import { ResourceStateComponent } from '../../components/resource-state.component';
import { IntegrationCallModalComponent, RETRYABLE_CALL } from './integration-call-modal.component';

const PROVIDERS: readonly IntegrationProvider[] = ['NAFATH', 'SHOMOOS', 'EWAA'];
const STATUSES: readonly IntegrationCallStatus[] = ['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD'];
const PAGE_SIZE = 20;

/** `/admin/integrations` — health of the government integrations and their outbound calls log (SRS §INT). */
@Component({
  selector: 'app-integrations-page',
  imports: [
    FormsModule,
    TranslatePipe,
    FORMAT_PIPES,
    PageHeaderComponent,
    IconComponent,
    EmptyStateComponent,
    StatusPillComponent,
    PagerComponent,
    ResourceStateComponent,
    IntegrationCardComponent,
    IntegrationCallModalComponent,
  ],
  templateUrl: './integrations.page.html',
  styles: `
    .filter {
      width: auto;
    }
    .filter-input {
      max-width: 200px;
    }
    .err {
      max-width: 220px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntegrationsPage {
  private readonly api = inject(AdminConfigApi);
  private readonly toast = inject(ToastService);
  private readonly queues = inject(AdminQueuesService);

  protected readonly providers = PROVIDERS;
  protected readonly statuses = STATUSES;
  protected readonly retryable = RETRYABLE_CALL;

  protected readonly provider = signal<IntegrationProvider | ''>('');
  protected readonly status = signal<IntegrationCallStatus | ''>('');
  protected readonly operation = signal('');
  protected readonly entityId = signal('');
  protected readonly currentPage = linkedSignal({ source: () => [this.provider(), this.status(), this.operation(), this.entityId()], computation: () => 1 });
  protected readonly viewing = signal<Uuid | null>(null);
  protected readonly retrying = signal<Uuid | null>(null);

  protected readonly health = rxResource({ stream: () => this.api.integrations() });

  protected readonly calls = rxResource({
    params: () => ({
      provider: this.provider() || undefined,
      status: this.status() || undefined,
      operation: this.operation() || undefined,
      entityId: this.entityId() || undefined,
      page: this.currentPage(),
      limit: PAGE_SIZE,
    }),
    stream: ({ params }) => this.api.integrationCalls(params),
  });

  protected refresh(): void {
    this.health.reload();
    this.calls.reload();
    this.queues.refresh();
  }

  /** From a health card: show that provider's calls (optionally the failed ones only). */
  protected showCalls(provider: IntegrationProvider, failedOnly: boolean): void {
    this.provider.set(provider);
    this.status.set(failedOnly ? 'FAILED' : '');
  }

  protected retry(call: IntegrationCall): void {
    this.retrying.set(call.id);
    this.api.retryIntegrationCall(call.id).subscribe({
      next: () => {
        this.retrying.set(null);
        this.toast.success('admin.integrations.retried');
        this.refresh();
      },
      error: (err) => {
        this.retrying.set(null);
        this.toast.apiError(err);
      },
    });
  }
}
