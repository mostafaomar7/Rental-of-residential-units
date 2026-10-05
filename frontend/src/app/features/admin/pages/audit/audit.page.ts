import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuditLog } from '@api/dto';
import { AdminPlatformApi } from '@api/endpoints/admin-platform.api';
import { ToastService } from '@core/services/toast.service';
import { saveBlob } from '@core/utils/download.utils';
import { today } from '@core/utils/date.utils';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { endOfSaudiDay, startOfSaudiDay } from '../../admin-dates';
import { PagerComponent } from '../../components/pager.component';
import { ResourceStateComponent } from '../../components/resource-state.component';
import { toCsv } from '../../csv';

const PAGE_SIZE = 50;
const CSV_COLUMNS = ['time', 'action', 'entityType', 'entityId', 'actor', 'ip'] as const;

/** `/admin/audit` — immutable log of sensitive actions: filters, before / after details, CSV of the loaded page (SRS §ADM). */
@Component({
  selector: 'app-audit-page',
  imports: [JsonPipe, FormsModule, TranslatePipe, FORMAT_PIPES, PageHeaderComponent, IconComponent, EmptyStateComponent, ModalComponent, PagerComponent, ResourceStateComponent],
  templateUrl: './audit.page.html',
  styles: `
    .filter-input {
      max-width: 180px;
    }
    .date {
      width: auto;
    }
    pre.code {
      max-height: 320px;
      margin: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditPage {
  private readonly api = inject(AdminPlatformApi);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  protected readonly entityType = signal('');
  protected readonly entityId = signal('');
  protected readonly action = signal('');
  protected readonly actorId = signal('');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly viewing = signal<AuditLog | null>(null);

  private readonly filters = computed(() => ({
    entityType: this.entityType() || undefined,
    entityId: this.entityId() || undefined,
    action: this.action() || undefined,
    actorId: this.actorId() || undefined,
    from: this.from() ? startOfSaudiDay(this.from()) : undefined,
    to: this.to() ? endOfSaudiDay(this.to()) : undefined,
  }));
  protected readonly currentPage = linkedSignal({ source: this.filters, computation: () => 1 });

  protected readonly logs = rxResource({
    params: () => ({ ...this.filters(), page: this.currentPage(), limit: PAGE_SIZE }),
    stream: ({ params }) => this.api.auditLogs(params),
  });

  protected clearFilters(): void {
    for (const filter of [this.entityType, this.entityId, this.action, this.actorId, this.from, this.to]) filter.set('');
  }

  /** CSV of the entries on screen (the API has no export endpoint). */
  protected export(): void {
    if (!this.logs.hasValue()) return;
    const entries = this.logs.value().items;
    const header = CSV_COLUMNS.map((c) => this.translate.instant(`admin.audit.cols.${c}`));
    const rows = entries.map((a) => [a.createdAt, a.action, a.entityType, a.entityId, a.actorId ?? this.translate.instant('admin.audit.system'), a.ip]);
    saveBlob(toCsv(header, rows), `rawaaf-audit-${today()}.csv`);
    this.toast.success('admin.audit.exported', { count: entries.length });
  }
}
