import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { DamageCase } from '@api/dto';
import { MeApi } from '@api/endpoints/me.api';
import { ConfirmService } from '@core/services/confirm.service';
import { FormatService } from '@core/services/format.service';
import { ToastService } from '@core/services/toast.service';
import { AuthSrcDirective } from '@shared/directives/auth-src.directive';
import { AppDatePipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { FieldComponent } from '@shared/ui/field/field.component';
import { KvComponent } from '@shared/ui/kv/kv.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { LoadStateComponent } from '../../../components/load-state/load-state.component';
import { WalletService } from '../../../services/wallet.service';

const MIN_OBJECTION_LENGTH = 10;

/**
 * Damage claims against the guest's bookings (SRS §POL damage policy): evidence, amounts, and —
 * while the guest is notified — accept or object before the deadline.
 */
@Component({
  selector: 'app-claims-tab',
  imports: [
    TranslatePipe,
    LocalizePipe,
    AppDatePipe,
    SarPipe,
    AuthSrcDirective,
    EmptyStateComponent,
    FieldComponent,
    KvComponent,
    ModalComponent,
    StatusPillComponent,
    LoadStateComponent,
  ],
  template: `
    <h2 class="h2 mb-16">{{ 'account.nav.claims' | translate }}</h2>
    @if (cases.hasValue()) {
      <div class="stack">
        @for (c of cases.value(); track c.id) {
          <div class="card card-p">
            <div class="row between wrap">
              <div>
                <div class="bb">{{ c.property | loc }}</div>
                <div class="xs muted">
                  <span class="ltr">{{ c.number }}</span> • {{ 'account.claims.booking' | translate: { number: c.booking.number } }} •
                  {{ 'account.stay.dateRange' | translate: { from: (c.booking.checkIn | appDate: 'medium'), to: (c.booking.checkOut | appDate: 'medium') } }}
                </div>
              </div>
              <app-status-pill domain="damage" [code]="c.status" />
            </div>
            <p class="small lh mt-8">{{ c.description }}</p>
            @if (c.photos.length) {
              <div class="thumbs-row mt-8">
                @for (photo of c.photos; track photo.id) {
                  <img [authSrc]="photo.thumbUrl" [alt]="'account.claims.evidence' | translate" />
                }
              </div>
            }
            <div class="soft-lg mt-12">
              <app-kv [label]="'account.claims.claimed' | translate">{{ c.amountClaimed | sar }}</app-kv>
              @if (c.amountApproved !== null) {
                <app-kv [label]="'account.claims.approved' | translate">{{ c.amountApproved | sar }}</app-kv>
              }
              @if (c.objectionDeadline) {
                <app-kv [label]="'account.claims.deadline' | translate">{{ c.objectionDeadline | appDate: 'dateTime' }}</app-kv>
              }
              @if (c.settlement; as s) {
                <app-kv [label]="'account.claims.settled' | translate">{{ s.at | appDate: 'medium' }}</app-kv>
              }
            </div>
            @if (c.reviewNote) {
              <p class="xs muted mt-8">{{ c.reviewNote }}</p>
            }
            @if (c.objection) {
              <div class="owner-reply">
                <div class="xs b gold-dark">{{ 'account.claims.yourObjection' | translate }}</div>
                {{ c.objection }}
              </div>
            }
            @if (c.finalNote) {
              <div class="owner-reply">
                <div class="xs b gold-dark">{{ 'account.claims.decision' | translate }}</div>
                {{ c.finalNote }}
              </div>
            }
            @if (c.status === 'GUEST_NOTIFIED') {
              <div class="row wrap mt-12">
                <button type="button" class="btn btn-primary btn-sm" [disabled]="busy() === c.id" (click)="accept(c)">{{ 'account.claims.accept' | translate }}</button>
                <button type="button" class="btn btn-outline btn-sm" [disabled]="busy() === c.id" (click)="objecting.set(c)">{{ 'account.claims.object' | translate }}</button>
              </div>
            }
          </div>
        } @empty {
          <div class="card">
            <app-empty-state icon="shield-check" [title]="'account.claims.emptyTitle' | translate" [subtitle]="'account.claims.emptySub' | translate" />
          </div>
        }
      </div>
    } @else {
      <div class="card">
        <app-load-state [error]="cases.error()" (retry)="cases.reload()" />
      </div>
    }

    @if (objecting(); as c) {
      <app-modal size="sm" [title]="'account.claims.objectTitle' | translate: { number: c.number }" (closed)="objecting.set(null)">
        <app-field [label]="'account.claims.objectLabel' | translate" for="cl-obj" [help]="'account.claims.objectHelp' | translate: { min: minObjection }">
          <textarea id="cl-obj" class="textarea" [value]="objection()" (input)="objection.set($any($event.target).value)"></textarea>
        </app-field>
        <ng-container modal-footer>
          <button type="button" class="btn btn-primary" [disabled]="busy() === c.id" (click)="object(c)">{{ 'account.claims.sendObjection' | translate }}</button>
          <button type="button" class="btn btn-ghost" (click)="objecting.set(null)">{{ 'common.cancel' | translate }}</button>
        </ng-container>
      </app-modal>
    }
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClaimsTabComponent {
  private readonly meApi = inject(MeApi);
  private readonly confirm = inject(ConfirmService);
  private readonly format = inject(FormatService);
  private readonly toast = inject(ToastService);
  private readonly wallet = inject(WalletService);

  protected readonly minObjection = MIN_OBJECTION_LENGTH;
  protected readonly cases = rxResource({ stream: () => this.meApi.damageCases() });
  protected readonly busy = signal<Uuid | null>(null);
  protected readonly objecting = signal<DamageCase | null>(null);
  protected readonly objection = signal('');

  protected async accept(claim: DamageCase): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'account.claims.acceptTitle',
      message: 'account.claims.acceptMessage',
      messageParams: { amount: this.format.sar(claim.amountApproved ?? claim.amountClaimed) },
      okLabel: 'account.claims.accept',
    });
    if (!ok) return;
    this.busy.set(claim.id);
    this.meApi.acceptDamageCase(claim.id).subscribe({
      next: (updated) => this.done(updated, 'account.claims.accepted'),
      error: (err: unknown) => this.failed(err),
    });
  }

  protected object(claim: DamageCase): void {
    const text = this.objection().trim();
    if (text.length < MIN_OBJECTION_LENGTH) {
      this.toast.error('account.claims.objectionTooShort', { min: MIN_OBJECTION_LENGTH });
      return;
    }
    this.busy.set(claim.id);
    this.meApi.objectDamageCase(claim.id, text).subscribe({
      next: (updated) => {
        this.objecting.set(null);
        this.objection.set('');
        this.done(updated, 'account.claims.objected');
      },
      error: (err: unknown) => this.failed(err),
    });
  }

  private done(updated: DamageCase, messageKey: string): void {
    this.busy.set(null);
    this.cases.update((list) => list?.map((c) => (c.id === updated.id ? updated : c)));
    this.wallet.reload();
    this.toast.success(messageKey);
  }

  private failed(err: unknown): void {
    this.busy.set(null);
    this.toast.apiError(err);
  }
}
