import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { DamageCase } from '@api/dto';
import { AdminPlatformApi } from '@api/endpoints/admin-platform.api';
import { ConfirmService } from '@core/services/confirm.service';
import { FormatService } from '@core/services/format.service';
import { ToastService } from '@core/services/toast.service';
import { AuthSrcDirective } from '@shared/directives/auth-src.directive';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { KvComponent } from '@shared/ui/kv/kv.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';

type SettlementMethod = 'WALLET' | 'EXTERNAL';

/**
 * Neutral review of a damage case: evidence, guest objection and history, then the action the
 * current status allows (start review → approve / reject → final decision if disputed → settle → close).
 * Emits the updated case after every action.
 */
/** The API rejects shorter decision notes. */
const MIN_NOTE_LENGTH = 10;

@Component({
  selector: 'app-damage-review-modal',
  imports: [FormsModule, TranslatePipe, FORMAT_PIPES, LocalizePipe, AuthSrcDirective, ModalComponent, FieldComponent, KvComponent, IconComponent, StatusPillComponent],
  templateUrl: './damage-review-modal.component.html',
  styles: `
    .evidence {
      width: 130px;
      height: 100px;
      border-radius: 12px;
      object-fit: cover;
    }
    .zoom-btn {
      padding: 0;
      border: 0;
      background: none;
      cursor: zoom-in;
    }
    .response {
      margin-top: 0;
    }
    .note {
      min-height: 70px;
    }
    .zoomed {
      width: 100%;
      border-radius: 16px;
    }
    .event {
      padding: 10px 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DamageReviewModalComponent {
  private readonly api = inject(AdminPlatformApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly format = inject(FormatService);

  readonly damage = input.required<DamageCase>();
  readonly changed = output<DamageCase>();
  readonly closed = output<void>();

  /** Latest version of the case (updated in place after each action). */
  protected readonly current = linkedSignal(() => this.damage());
  protected readonly amount = linkedSignal(() => this.current().amountApproved ?? this.current().amountClaimed);
  protected readonly note = signal('');
  protected readonly method = signal<SettlementMethod>('WALLET');
  protected readonly reference = signal('');
  protected readonly busy = signal(false);
  protected readonly zoomed = signal<string | null>(null);

  /** Newest first. */
  protected readonly events = computed(() => [...this.current().events].reverse());

  protected startReview(): void {
    this.run(this.api.startDamageReview(this.current().id), 'admin.disputes.reviewStarted');
  }

  protected approve(): void {
    const amount = Number(this.amount());
    if (!(amount > 0)) return this.toast.error('admin.disputes.amountInvalid');
    if (!this.requireNote()) return;
    this.run(this.api.approveDamage(this.current().id, amount, this.note().trim()), 'admin.disputes.approvedToast', { amount: this.format.sar(amount) });
  }

  protected async reject(): Promise<void> {
    if (!this.requireNote()) return;
    const ok = await this.confirm.ask({ title: 'admin.disputes.rejectTitle', message: 'admin.disputes.rejectMessage', okLabel: 'admin.disputes.rejectCase', danger: true });
    if (ok) this.run(this.api.rejectDamage(this.current().id, this.note().trim()), 'admin.disputes.rejectedToast');
  }

  protected decide(): void {
    const amount = Number(this.amount());
    if (!(amount >= 0)) return this.toast.error('admin.disputes.amountInvalid');
    if (!this.requireNote()) return;
    this.run(this.api.decideDamage(this.current().id, amount, this.note().trim()), 'admin.disputes.decidedToast', { amount: this.format.sar(amount) });
  }

  protected settle(): void {
    const reference = this.reference().trim();
    if (this.method() === 'EXTERNAL' && !reference) return this.toast.error('admin.disputes.referenceRequired');
    this.run(this.api.settleDamage(this.current().id, this.method(), reference || undefined), 'admin.disputes.settledToast');
  }

  protected async close(): Promise<void> {
    if (!this.requireNote()) return;
    const ok = await this.confirm.ask({ title: 'admin.disputes.closeTitle', message: 'admin.disputes.closeMessage', okLabel: 'admin.disputes.closeCase' });
    if (ok) this.run(this.api.closeDamage(this.current().id, this.note().trim()), 'admin.disputes.closedToast');
  }

  private requireNote(): boolean {
    if (this.note().trim().length >= MIN_NOTE_LENGTH) return true;
    this.toast.error('admin.disputes.noteRequired', { min: MIN_NOTE_LENGTH });
    return false;
  }

  private run(request: Observable<DamageCase>, successKey: string, params?: Record<string, unknown>): void {
    this.busy.set(true);
    request.subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.current.set(updated);
        this.note.set('');
        this.reference.set('');
        this.toast.success(successKey, params);
        this.changed.emit(updated);
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
