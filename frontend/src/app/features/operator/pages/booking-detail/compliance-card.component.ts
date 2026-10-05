import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { ManagedBooking } from '@api/dto';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { KvComponent } from '@shared/ui/kv/kv.component';
import { LoadErrorComponent, LoadingComponent } from '../../components/async-state.component';

/** Guest identity (Nafath / manual), SHOMOOS registration and anything holding the digital key back. */
@Component({
  selector: 'app-compliance-card',
  imports: [TranslatePipe, AppDatePipe, IconComponent, KvComponent, LoadingComponent, LoadErrorComponent],
  template: `
    <h3 class="h3 mb-12">{{ 'operations.booking.compliance.title' | translate }}</h3>
    @if (resource.isLoading()) {
      <app-loading />
    } @else if (resource.error()) {
      <app-load-error [error]="resource.error()" (retry)="resource.reload()" />
    } @else if (resource.hasValue()) {
      @let c = resource.value();
      @if (c.identity.verified) {
        <div class="notice green small">
          <app-icon name="badge-check" />
          <div>
            <b>{{ 'operations.booking.compliance.verified' | translate }}</b>
            @if (c.identity.type; as type) {
              <br /><span class="xs">{{ 'domain.api.identityType.' + type | translate }}</span>
            }
          </div>
        </div>
      } @else {
        <div class="notice small" [class]="c.identity.required ? 'amber' : 'blue'">
          <app-icon name="alert-triangle" />
          <div>
            <b>{{ (c.identity.provided ? 'operations.booking.compliance.provided' : 'operations.booking.compliance.missing') | translate }}</b>
            @if (c.identity.required) {
              <br /><span class="xs">{{ 'operations.booking.compliance.required' | translate }}</span>
            }
          </div>
        </div>
      }
      @if (c.shomoos; as shomoos) {
        <app-kv [label]="'operations.booking.compliance.shomoos' | translate"><span class="ltr">{{ shomoos.status }}</span></app-kv>
        @if (shomoos.reference) {
          <app-kv [label]="'operations.booking.compliance.reference' | translate"><span class="ltr">{{ shomoos.reference }}</span></app-kv>
        }
        @if (shomoos.registeredAt) {
          <app-kv [label]="'operations.booking.compliance.registeredAt' | translate">{{ shomoos.registeredAt | appDate: 'dateTime' }}</app-kv>
        }
        @if (shomoos.blocksKey) {
          <div class="xs muted mt-4">{{ 'operations.booking.compliance.blocksKey' | translate }}</div>
        }
      }
      @if (c.keyHold) {
        <div class="notice red small mt-8">
          <app-icon name="lock" />
          <div>{{ 'operations.booking.compliance.keyHold' | translate }} <span class="ltr">({{ c.keyHold }})</span></div>
        </div>
      }
    }
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComplianceCardComponent {
  private readonly api = inject(HostOperationsApi);

  readonly booking = input.required<ManagedBooking>();

  protected readonly resource = rxResource({
    params: () => ({ id: this.booking().id, status: this.booking().status }),
    stream: ({ params }) => this.api.compliance(params.id),
  });
}
