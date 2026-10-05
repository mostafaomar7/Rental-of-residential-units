import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { DocumentType, PropertyDocument } from '@api/dto';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { ToastService } from '@core/services/toast.service';
import { AppDatePipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoadErrorComponent, LoadingComponent } from '../../../components/async-state.component';
import { ListingChecklistComponent } from '../../../components/listing-checklist.component';
import { Mutation } from '../../../services/mutation';
import { DOCUMENT_TYPES } from '../../property-profile/tabs/governance-tab.component';
import { AddPropertyWizardService } from '../add-property-wizard.service';

/** Step 9 — summary, submission checklist, ownership documents and the owner's declaration. */
@Component({
  selector: 'app-step-review',
  imports: [TranslatePipe, AppDatePipe, SarPipe, LocalizePipe, IconComponent, LoadingComponent, LoadErrorComponent, ListingChecklistComponent],
  templateUrl: './step-review.component.html',
  styles: `
    .upload input {
      display: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepReviewComponent {
  private readonly api = inject(HostPropertiesApi);
  private readonly toast = inject(ToastService);
  protected readonly wizard = inject(AddPropertyWizardService);

  protected readonly documentTypes = DOCUMENT_TYPES;
  protected readonly uploading = new Mutation();
  /** Documents uploaded on this step, by type. */
  protected readonly documents = signal<Partial<Record<DocumentType, PropertyDocument>>>({});

  protected readonly checklist = rxResource({
    params: () => {
      const id = this.wizard.property()?.id;
      // Reloads after each document upload (documents are part of the checklist).
      return id ? { id, documents: Object.keys(this.documents()).length } : undefined;
    },
    stream: ({ params }) => this.api.checklist(params.id),
  });

  protected onDocument(type: DocumentType, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const draft = this.wizard.property();
    if (!file || !draft) return;
    this.uploading.run(this.api.uploadDocument(draft.id, file, type), (doc) => {
      this.documents.update((docs) => ({ ...docs, [type]: doc }));
      this.toast.success('operator.profile.gov.docUploaded');
    });
  }
}
