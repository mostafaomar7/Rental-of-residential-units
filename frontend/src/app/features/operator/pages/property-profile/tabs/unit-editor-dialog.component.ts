import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { ManagedUnit } from '@api/dto';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { ToastService } from '@core/services/toast.service';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { ToggleComponent } from '@shared/ui/toggle/toggle.component';
import { UnitForm, UnitFormComponent, emptyUnitForm, isUnitFormValid, unitFormBody, unitToForm } from '../../../components/unit-form.component';
import { Mutation } from '../../../services/mutation';

/** Adds a unit to a property, or edits one (including whether it is offered for booking). */
@Component({
  selector: 'app-unit-editor-dialog',
  imports: [TranslatePipe, ModalComponent, ToggleComponent, UnitFormComponent],
  template: `
    <app-modal size="lg" [title]="(unit() ? 'operator.unit.editTitle' : 'operator.unit.addTitle') | translate" (closed)="closed.emit()">
      <app-unit-form idPrefix="ue" [(value)]="form" />
      @if (unit()) {
        <div class="setting-row mt-12">
          <div>
            <div class="b small">{{ 'operator.unit.active' | translate }}</div>
            <div class="xs muted">{{ 'operator.unit.activeHint' | translate }}</div>
          </div>
          <app-toggle [(checked)]="active" [label]="'operator.unit.active' | translate" />
        </div>
      }
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="saving.busy() || !valid()" (click)="save()">
          @if (saving.busy()) {
            <span class="spin"></span>
          }
          {{ 'common.save' | translate }}
        </button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitEditorDialogComponent {
  private readonly api = inject(HostPropertiesApi);
  private readonly toast = inject(ToastService);

  readonly propertyId = input.required<Uuid>();
  /** Unit to edit; omit to add a new one. */
  readonly unit = input<ManagedUnit>();
  readonly closed = output<void>();
  readonly saved = output<ManagedUnit>();

  protected readonly saving = new Mutation();
  protected readonly form = linkedSignal<UnitForm>(() => {
    const unit = this.unit();
    return unit ? unitToForm(unit) : emptyUnitForm();
  });
  protected readonly active = linkedSignal(() => this.unit()?.isActive ?? true);
  protected readonly valid = computed(() => isUnitFormValid(this.form()));

  protected save(): void {
    if (!this.valid()) return;
    const body = unitFormBody(this.form());
    const unit = this.unit();
    const request = unit ? this.api.updateUnit(unit.id, { ...body, isActive: this.active() }) : this.api.addUnit(this.propertyId(), body);
    this.saving.run(request, (saved) => {
      this.toast.success(unit ? 'operator.unit.updated' : 'operator.unit.added');
      this.saved.emit(saved);
    });
  }
}
