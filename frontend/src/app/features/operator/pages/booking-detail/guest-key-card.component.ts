import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { DoorCode, GuestKey, ManagedBooking } from '@api/dto';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { LoadErrorComponent, LoadingComponent } from '../../components/async-state.component';
import { DoorCodeModalComponent } from '../../components/door-code-modal.component';
import { Mutation } from '../../services/mutation';
import { KeyWindowModalComponent } from './key-window-modal.component';

/** Guest digital key of a booking: status and validity, window change, reissue and emergency code. */
@Component({
  selector: 'app-guest-key-card',
  imports: [TranslatePipe, AppDatePipe, StatusPillComponent, LoadingComponent, LoadErrorComponent, DoorCodeModalComponent, KeyWindowModalComponent],
  template: `
    <h3 class="h3 mb-12">{{ 'operations.booking.key.title' | translate }}</h3>
    @if (resource.isLoading() && !resource.hasValue()) {
      <app-loading />
    } @else if (resource.error()) {
      <app-load-error [error]="resource.error()" (retry)="resource.reload()" />
    } @else if (resource.hasValue()) {
      @let access = resource.value();
      @if (!access.hasLock) {
        <div class="xs muted">{{ 'operations.booking.key.noLock' | translate }}</div>
      } @else if (access.key; as key) {
        <div class="row between">
          <span class="pill pill-gray">{{ 'operations.locks.mode.' + key.mode | translate }}</span>
          <app-status-pill domain="key" [code]="key.status" />
        </div>
        <div class="xs muted mt-8">
          {{ 'operator.common.range' | translate: { from: (key.validFrom | appDate: 'dateTime'), to: (key.validTo | appDate: 'dateTime') } }}
        </div>
        @if (key.lastError) {
          <div class="xs red mt-4">{{ key.lastError }}</div>
        }
        @if (key.revokedAt) {
          <div class="xs muted mt-4">{{ 'operations.booking.key.revokedAt' | translate: { time: (key.revokedAt | appDate: 'dateTime') } }}</div>
        }
        <div class="row wrap mt-12">
          <button type="button" class="btn btn-ghost btn-xs" [disabled]="action.busy()" (click)="editingWindow.set(true)">
            {{ 'operations.booking.key.changeWindow' | translate }}
          </button>
          <button type="button" class="btn btn-ghost btn-xs" [disabled]="action.busy()" (click)="reissue()">{{ 'operations.booking.key.reissue' | translate }}</button>
          <button type="button" class="btn btn-danger btn-xs" [disabled]="action.busy()" (click)="emergency()">{{ 'operations.booking.key.emergency' | translate }}</button>
        </div>
        @if (editingWindow()) {
          <app-key-window-modal [bookingId]="booking().id" [key]="key" (closed)="editingWindow.set(false)" (saved)="onWindowSaved($event)" />
        }
      } @else {
        <div class="xs muted">{{ 'operations.booking.key.notIssued' | translate }}</div>
        @if (canIssue()) {
          <button type="button" class="btn btn-ghost btn-xs mt-12" [disabled]="action.busy()" (click)="reissue()">{{ 'operations.booking.key.issue' | translate }}</button>
        }
      }
    }

    @if (emergencyCode(); as code) {
      <app-door-code-modal
        [code]="code"
        [title]="'operations.booking.key.emergencyTitle' | translate"
        [subtitle]="booking().number"
        icon="siren"
        tone="red"
        (closed)="emergencyCode.set(null)"
      />
    }
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestKeyCardComponent {
  private readonly api = inject(HostOperationsApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly booking = input.required<ManagedBooking>();

  protected readonly action = new Mutation();
  protected readonly editingWindow = signal(false);
  protected readonly emergencyCode = signal<DoorCode | null>(null);

  protected readonly resource = rxResource({
    params: () => ({ id: this.booking().id, status: this.booking().status }),
    stream: ({ params }) => this.api.guestKey(params.id),
  });

  /** A key can be (re)issued for upcoming and current stays. */
  protected readonly canIssue = computed(() => ['CONFIRMED', 'CHECKED_IN'].includes(this.booking().status));

  protected onWindowSaved(key: GuestKey): void {
    this.editingWindow.set(false);
    this.resource.set(key);
  }

  protected async reissue(): Promise<void> {
    const ok = await this.confirm.ask({ title: 'operations.booking.key.reissueTitle', message: 'operations.booking.key.reissueMessage' });
    if (!ok) return;
    this.action.run(this.api.reissueKey(this.booking().id), (key) => {
      this.toast.success('operations.booking.toast.keyReissued');
      this.resource.set(key);
    });
  }

  protected async emergency(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'operations.booking.key.emergencyTitle',
      message: 'operations.booking.key.emergencyMessage',
      okLabel: 'operations.booking.key.emergency',
      danger: true,
    });
    if (!ok) return;
    this.action.run(this.api.emergencyCode(this.booking().id), (code) => this.emergencyCode.set(code));
  }
}
