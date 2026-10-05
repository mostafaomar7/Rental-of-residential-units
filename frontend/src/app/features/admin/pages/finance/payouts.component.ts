import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminBusinessApi } from '@api/endpoints/admin-business.api';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { StatTileComponent } from '@shared/ui/stat-tile/stat-tile.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { ResourceStateComponent } from '../../components/resource-state.component';

/** What each owner is owed: due now (issued statements) and still accruing. */
@Component({
  selector: 'app-payouts',
  imports: [TranslatePipe, FORMAT_PIPES, StatTileComponent, StatusPillComponent, EmptyStateComponent, ResourceStateComponent],
  template: `
    <app-resource-state [resource]="payouts" />
    @if (payouts.hasValue()) {
      @let p = payouts.value();
      <div class="grid g3 mb-16">
        <app-stat-tile icon="banknote" tone="gold" [value]="p.totals.dueNow | sar" [label]="'admin.finance.payouts.dueNow' | translate" />
        <app-stat-tile icon="hourglass" [value]="p.totals.accruing | sar" [label]="'admin.finance.payouts.accruing' | translate" />
        <app-stat-tile icon="wallet" tone="black" [value]="p.totals.total | sar" [label]="'admin.finance.payouts.total' | translate" />
      </div>

      <div class="card card-p">
        @if (p.items.length) {
          <div class="tbl-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>{{ 'admin.finance.payouts.owner' | translate }}</th>
                  <th>{{ 'admin.finance.payouts.bankAccount' | translate }}</th>
                  <th>{{ 'admin.finance.payouts.unpaid' | translate }}</th>
                  <th>{{ 'admin.finance.payouts.dueNow' | translate }}</th>
                  <th>{{ 'admin.finance.payouts.accruing' | translate }}</th>
                  <th>{{ 'admin.finance.payouts.total' | translate }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (row of p.items; track row.owner.id) {
                  <tr>
                    <td>
                      <div class="b">{{ row.owner.fullName }}</div>
                      <div class="xs muted ltr">{{ row.owner.mobile }}</div>
                    </td>
                    <td>
                      @if (row.bankAccount; as bank) {
                        <app-status-pill domain="bankAccount" [code]="bank.status" />
                        <div class="xs muted ltr mt-4">•••• {{ bank.ibanLast4 }}</div>
                      } @else {
                        <span class="pill pill-red">{{ 'admin.finance.payouts.noAccount' | translate }}</span>
                      }
                    </td>
                    <td>{{ row.unpaidStatements | num }}</td>
                    <td class="b nowrap">{{ row.dueNow | sar }}</td>
                    <td class="nowrap">{{ row.accruing | sar }}</td>
                    <td class="b nowrap">{{ row.total | sar }}</td>
                    <td>
                      <button type="button" class="btn btn-ghost btn-xs" (click)="showStatements.emit(row.owner)">{{ 'admin.finance.payouts.statements' | translate }}</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state icon="check-check" [title]="'admin.finance.payouts.empty' | translate" />
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayoutsComponent {
  private readonly api = inject(AdminBusinessApi);

  /** Open the statements of this owner. */
  readonly showStatements = output<{ id: string; fullName: string }>();

  protected readonly payouts = rxResource({ stream: () => this.api.outstandingPayouts() });
}
