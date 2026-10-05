import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { AdminBusinessApi } from '@api/endpoints/admin-business.api';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { KvComponent } from '@shared/ui/kv/kv.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { ResourceStateComponent } from '../../components/resource-state.component';

/** One statement with its totals and earning lines. */
@Component({
  selector: 'app-statement-modal',
  imports: [TranslatePipe, FORMAT_PIPES, LocalizePipe, ModalComponent, KvComponent, StatusPillComponent, ResourceStateComponent],
  template: `
    <app-modal size="xl" [title]="'admin.finance.statements.detailTitle' | translate" (closed)="closed.emit()">
      <app-resource-state [resource]="statement" />
      @if (statement.hasValue()) {
        @let s = statement.value();
        <div class="grid g2">
          <div>
            <app-kv [label]="'admin.finance.statements.number' | translate"><span class="ltr">{{ s.number }}</span></app-kv>
            <app-kv [label]="'admin.finance.payouts.owner' | translate">{{ s.owner?.fullName ?? ('common.none' | translate) }}</app-kv>
            <app-kv [label]="'admin.finance.statements.period' | translate">{{ 'admin.common.range' | translate: { from: (s.periodStart | appDate: 'medium'), to: (s.periodEnd | appDate: 'medium') } }}</app-kv>
            <app-kv [label]="'admin.finance.statements.status' | translate"><app-status-pill domain="statement" [code]="s.status" /></app-kv>
            @if (s.bankReference) {
              <app-kv [label]="'admin.finance.statements.bankReference' | translate"><span class="ltr">{{ s.bankReference }}</span></app-kv>
            }
          </div>
          <div>
            <app-kv [label]="'admin.finance.split.gross' | translate">{{ s.gross | sar }}</app-kv>
            <app-kv [label]="'admin.finance.split.vat' | translate">{{ s.vat | sar }}</app-kv>
            <app-kv [label]="'admin.finance.split.commission' | translate">{{ s.commission | sar }}</app-kv>
            <app-kv [label]="'admin.finance.split.fees' | translate">{{ s.paymentFees | sar }}</app-kv>
            <div class="kv total">
              <span>{{ 'admin.finance.split.net' | translate }}</span><span>{{ s.net | sar }}</span>
            </div>
          </div>
        </div>

        @if (s.lines?.length) {
          <div class="tbl-wrap mt-16">
            <table class="tbl">
              <thead>
                <tr>
                  <th>{{ 'admin.finance.statements.date' | translate }}</th>
                  <th>{{ 'admin.finance.statements.line' | translate }}</th>
                  <th>{{ 'admin.finance.split.gross' | translate }}</th>
                  <th>{{ 'admin.finance.split.commission' | translate }}</th>
                  <th>{{ 'admin.finance.split.net' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (line of s.lines; track line.id) {
                  <tr>
                    <td class="small nowrap">{{ line.earnedOn | appDate: 'medium' }}</td>
                    <td class="small">
                      <span class="pill pill-gray">{{ 'domain.api.earningType.' + line.type | translate }}</span>
                      {{ line | loc: 'description' }}
                      @if (line.bookingNumber) {
                        <span class="xs muted ltr">{{ line.bookingNumber }}</span>
                      }
                    </td>
                    <td class="nowrap">{{ line.gross | sar }}</td>
                    <td class="nowrap">{{ line.commission | sar }}</td>
                    <td class="b nowrap">{{ line.net | sar }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatementModalComponent {
  private readonly api = inject(AdminBusinessApi);

  readonly statementId = input.required<Uuid>();
  readonly closed = output<void>();

  protected readonly statement = rxResource({ params: () => this.statementId(), stream: ({ params }) => this.api.statement(params) });
}
