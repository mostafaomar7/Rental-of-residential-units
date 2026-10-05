import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { Uuid } from '@api/api.types';
import { ManagedProperty, PropertyDocument } from '@api/dto';
import { AdminPlatformApi } from '@api/endpoints/admin-platform.api';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { saveBlob } from '@core/utils/download.utils';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { KvComponent } from '@shared/ui/kv/kv.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { ReasonModalComponent } from '../../components/reason-modal.component';
import { ResourceStateComponent } from '../../components/resource-state.component';

/** Standard rejection reasons offered to the reviewer. */
const REJECT_REASONS = ['deed_mismatch', 'license_invalid', 'photos_substandard', 'out_of_area', 'incomplete'].map((r) => `admin.verification.reasons.${r}`);

type ReasonAction = 'reject' | 'suspend';

const BYTES_PER_KB = 1024;

/**
 * Full review of one property (owner, identity, content, units, documents, completeness checklist)
 * with the review decisions. Emits the updated property after every decision.
 */
@Component({
  selector: 'app-property-review-modal',
  imports: [TranslatePipe, FORMAT_PIPES, LocalizePipe, ModalComponent, KvComponent, IconComponent, StatusPillComponent, ResourceStateComponent, ReasonModalComponent],
  templateUrl: './property-review-modal.component.html',
  styles: `
    .photos img {
      width: 96px;
      height: 72px;
    }
    .doc {
      gap: 8px;
    }
    .checklist {
      list-style: none;
      padding: 0;
      margin: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyReviewModalComponent {
  private readonly api = inject(AdminPlatformApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly propertyId = input.required<Uuid>();
  readonly changed = output<ManagedProperty>();
  readonly closed = output<void>();

  protected readonly property = rxResource({ params: () => this.propertyId(), stream: ({ params }) => this.api.property(params) });

  protected readonly busy = signal(false);
  protected readonly downloading = signal<Uuid | null>(null);
  protected readonly asking = signal<ReasonAction | null>(null);
  protected readonly rejectReasons = REJECT_REASONS;

  protected sizeKb(doc: PropertyDocument): number {
    return Math.max(1, Math.round(doc.sizeBytes / BYTES_PER_KB));
  }

  protected download(doc: PropertyDocument): void {
    this.downloading.set(doc.id);
    this.api.documentFile(doc.id).subscribe({
      next: (blob) => {
        saveBlob(blob, doc.originalName);
        this.downloading.set(null);
      },
      error: (err) => {
        this.downloading.set(null);
        this.toast.apiError(err);
      },
    });
  }

  protected async approve(property: ManagedProperty): Promise<void> {
    const incomplete = property.checklist && !property.checklist.complete;
    const ok = await this.confirm.ask({
      title: 'admin.verification.approveTitle',
      message: incomplete ? 'admin.verification.approveIncomplete' : 'admin.verification.approveMessage',
      messageParams: { name: property.identity.nameAr },
      okLabel: 'admin.verification.approve',
      danger: !!incomplete,
    });
    if (ok) this.run(this.api.approveProperty(property.id), 'admin.verification.approved');
  }

  protected async reactivate(property: ManagedProperty): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'admin.verification.reactivateTitle',
      message: 'admin.verification.reactivateMessage',
      messageParams: { name: property.identity.nameAr },
      okLabel: 'admin.verification.reactivate',
    });
    if (ok) this.run(this.api.reactivateProperty(property.id), 'admin.verification.reactivated');
  }

  protected submitReason(action: ReasonAction, reason: string): void {
    const id = this.propertyId();
    if (action === 'reject') this.run(this.api.rejectProperty(id, reason), 'admin.verification.rejected');
    else this.run(this.api.suspendProperty(id, reason), 'admin.verification.suspended');
  }

  private run(request: Observable<ManagedProperty>, successKey: string): void {
    this.busy.set(true);
    request.subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.asking.set(null);
        this.property.reload();
        this.toast.success(successKey);
        this.changed.emit(updated);
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
