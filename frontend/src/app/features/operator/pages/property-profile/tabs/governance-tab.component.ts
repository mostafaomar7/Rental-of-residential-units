import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { DocumentType, ManagedProperty, PropertyDocument } from '@api/dto';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { saveBlob } from '@core/utils/download.utils';
import { AppDatePipe, NumPipe } from '@shared/pipes/format.pipes';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { LoadErrorComponent, LoadingComponent } from '../../../components/async-state.component';
import { ListingChecklistComponent } from '../../../components/listing-checklist.component';
import { Mutation } from '../../../services/mutation';
import { OperatorPortfolioService } from '../../../services/operator-portfolio.service';
import { canSubmit, canWithdraw } from '../../../services/property-utils';

export const DOCUMENT_TYPES: readonly DocumentType[] = ['TITLE_DEED', 'LEASE', 'TOURISM_LICENSE', 'OPERATOR_AUTHORIZATION', 'OTHER'];
const BYTES_PER_KB = 1024;

/** Governance layer: review status, submission checklist, submit / withdraw, and ownership documents. */
@Component({
  selector: 'app-governance-tab',
  imports: [TranslatePipe, AppDatePipe, NumPipe, FieldComponent, IconComponent, StatusPillComponent, LoadingComponent, LoadErrorComponent, ListingChecklistComponent],
  templateUrl: './governance-tab.component.html',
  styles: `
    .gap-24 {
      gap: 24px;
    }
    .upload-btn {
      cursor: pointer;
    }
    .upload-btn input {
      display: none;
    }
    .doc {
      padding: 10px 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GovernanceTabComponent {
  private readonly api = inject(HostPropertiesApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly portfolio = inject(OperatorPortfolioService);

  readonly property = input.required<ManagedProperty>();
  readonly saved = output<ManagedProperty>();
  /** Documents changed — the property must be reloaded. */
  readonly changed = output<void>();

  protected readonly documentTypes = DOCUMENT_TYPES;
  protected readonly documentType = signal<DocumentType>('TITLE_DEED');
  protected readonly reviewAction = new Mutation();
  protected readonly documentAction = new Mutation();

  protected readonly checklist = rxResource({
    params: () => ({ id: this.property().id, status: this.property().status }),
    stream: ({ params }) => this.api.checklist(params.id),
  });

  protected readonly canSubmit = computed(() => canSubmit(this.property()));
  protected readonly canWithdraw = computed(() => canWithdraw(this.property()));

  protected setDocumentType(value: string): void {
    this.documentType.set(value as DocumentType);
  }

  protected sizeKb(doc: PropertyDocument): number {
    return doc.sizeBytes / BYTES_PER_KB;
  }

  protected async submit(): Promise<void> {
    const ok = await this.confirm.ask({ title: 'operator.profile.gov.submitTitle', message: 'operator.profile.gov.submitMessage', okLabel: 'operator.profile.gov.submit' });
    if (!ok) return;
    this.reviewAction.run(this.api.submit(this.property().id), (p) => {
      this.toast.success('operator.profile.gov.submitted');
      this.saved.emit(p);
    });
  }

  protected async withdraw(): Promise<void> {
    const ok = await this.confirm.ask({ title: 'operator.profile.gov.withdrawTitle', message: 'operator.profile.gov.withdrawMessage', okLabel: 'operator.profile.gov.withdraw' });
    if (!ok) return;
    this.reviewAction.run(this.api.withdraw(this.property().id), (p) => {
      this.toast.show('operator.profile.gov.withdrawn');
      this.saved.emit(p);
    });
  }

  protected async deleteDraft(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'operator.profile.gov.deleteTitle',
      message: 'operator.profile.gov.deleteMessage',
      okLabel: 'operator.profile.gov.delete',
      danger: true,
    });
    if (!ok) return;
    this.reviewAction.run(this.api.remove(this.property().id), () => {
      this.toast.show('operator.profile.gov.deleted');
      this.portfolio.reload();
      void this.router.navigate(['/operator/properties']);
    });
  }

  protected onDocument(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.documentAction.run(this.api.uploadDocument(this.property().id, file, this.documentType()), () => {
      this.toast.success('operator.profile.gov.docUploaded');
      this.changed.emit();
    });
  }

  protected download(doc: PropertyDocument): void {
    this.documentAction.run(this.api.documentFile(doc.id), (blob) => saveBlob(blob, doc.originalName));
  }

  protected async removeDocument(doc: PropertyDocument): Promise<void> {
    const ok = await this.confirm.ask({
      message: 'operator.profile.gov.docDeleteMessage',
      messageParams: { name: doc.originalName },
      okLabel: 'operator.profile.gov.docDelete',
      danger: true,
    });
    if (!ok) return;
    this.documentAction.run(this.api.deleteDocument(doc.id), () => {
      this.toast.show('operator.profile.gov.docDeleted');
      this.changed.emit();
    });
  }
}
