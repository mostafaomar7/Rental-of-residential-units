import { ChangeDetectionStrategy, Component, inject, linkedSignal, model, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { Statement } from '@api/dto';
import { AdminBusinessApi } from '@api/endpoints/admin-business.api';
import { ToastService } from '@core/services/toast.service';
import { saveBlob } from '@core/utils/download.utils';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { PagerComponent } from '../../components/pager.component';
import { ReasonModalComponent } from '../../components/reason-modal.component';
import { ResourceStateComponent } from '../../components/resource-state.component';
import { StatementModalComponent } from './statement-modal.component';

type StatementStatus = Statement['status'];

export interface OwnerFilter {
  id: Uuid;
  fullName: string;
}

const STATUSES: readonly StatementStatus[] = ['ISSUED', 'PAID'];
const PAGE_SIZE = 20;

/** Monthly owner statements: generate a period, pay with a bank reference, CSV, lines. */
@Component({
  selector: 'app-statements',
  imports: [
    FormsModule,
    TranslatePipe,
    FORMAT_PIPES,
    StatusPillComponent,
    IconComponent,
    EmptyStateComponent,
    ModalComponent,
    FieldComponent,
    PagerComponent,
    ResourceStateComponent,
    ReasonModalComponent,
    StatementModalComponent,
  ],
  templateUrl: './statements.component.html',
  styles: `
    :host {
      display: block;
    }
    .filter {
      width: auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatementsComponent {
  private readonly api = inject(AdminBusinessApi);
  private readonly toast = inject(ToastService);

  /** Owner chosen from the payouts tab (clearable here). */
  readonly owner = model<OwnerFilter | null>(null);

  protected readonly statuses = STATUSES;
  protected readonly status = signal<StatementStatus | ''>('');
  /** `YYYY-MM`. */
  protected readonly period = signal('');
  protected readonly currentPage = linkedSignal({ source: () => [this.status(), this.period(), this.owner()], computation: () => 1 });

  protected readonly generating = signal(false);
  protected readonly generatePeriod = signal('');
  protected readonly paying = signal<Statement | null>(null);
  protected readonly viewing = signal<Uuid | null>(null);
  protected readonly busy = signal(false);
  protected readonly downloading = signal<Uuid | null>(null);

  protected readonly statements = rxResource({
    params: () => ({ status: this.status() || undefined, period: this.period() || undefined, ownerId: this.owner()?.id, page: this.currentPage(), limit: PAGE_SIZE }),
    stream: ({ params }) => this.api.statements(params),
  });

  protected generate(): void {
    this.busy.set(true);
    this.api.generateStatements(this.generatePeriod() || undefined).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.generating.set(false);
        this.toast.success('admin.finance.statements.generated', { count: res.issued, period: res.period });
        this.statements.reload();
      },
      error: (err) => this.fail(err),
    });
  }

  protected pay(statement: Statement, bankReference: string): void {
    this.busy.set(true);
    this.api.payStatement(statement.id, bankReference).subscribe({
      next: () => {
        this.busy.set(false);
        this.paying.set(null);
        this.toast.success('admin.finance.statements.paid', { number: statement.number });
        this.statements.reload();
      },
      error: (err) => this.fail(err),
    });
  }

  protected downloadCsv(statement: Statement): void {
    this.downloading.set(statement.id);
    this.api.statementCsv(statement.id).subscribe({
      next: (blob) => {
        this.downloading.set(null);
        saveBlob(blob, `statement-${statement.number}.csv`);
      },
      error: (err) => {
        this.downloading.set(null);
        this.toast.apiError(err);
      },
    });
  }

  private fail(err: unknown): void {
    this.busy.set(false);
    this.toast.apiError(err);
  }
}
