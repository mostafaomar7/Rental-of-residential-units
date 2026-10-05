import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Incident } from '@api/dto';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { ToastService } from '@core/services/toast.service';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { Mutation } from '../../services/mutation';

/** Resolves an incident; the resolution text is required (shown to the guest when they reported it). */
@Component({
  selector: 'app-resolve-incident-modal',
  imports: [FormsModule, TranslatePipe, FieldComponent, ModalComponent],
  template: `
    <app-modal size="sm" [title]="'operations.incidents.resolveTitle' | translate" [subtitle]="incident().description" (closed)="closed.emit()">
      <app-field [label]="'operations.incidents.resolution' | translate" for="ri-text">
        <textarea id="ri-text" class="textarea" [placeholder]="'operations.incidents.resolutionPlaceholder' | translate" [(ngModel)]="resolution"></textarea>
      </app-field>
      <ng-container modal-footer>
        <button type="button" class="btn btn-success" [disabled]="resolving.busy() || !valid()" (click)="resolve()">{{ 'operations.incidents.resolve' | translate }}</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResolveIncidentModalComponent {
  private readonly api = inject(HostOperationsApi);
  private readonly toast = inject(ToastService);

  readonly incident = input.required<Incident>();
  readonly closed = output<void>();
  readonly resolved = output<Incident>();

  protected readonly resolution = signal('');
  protected readonly valid = computed(() => !!this.resolution().trim());
  protected readonly resolving = new Mutation();

  protected resolve(): void {
    if (!this.valid()) return;
    this.resolving.run(this.api.updateIncident(this.incident().id, 'RESOLVED', this.resolution().trim()), (incident) => {
      this.toast.success('operations.incidents.toast.resolved');
      this.resolved.emit(incident);
    });
  }
}
