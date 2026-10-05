import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ManagedProperty, ManagedUnit } from '@api/dto';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { CatalogService } from '@core/services/catalog.service';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { SarPipe } from '@shared/pipes/format.pipes';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { Mutation } from '../../../services/mutation';
import { SaveBarComponent } from './save-bar.component';
import { UnitEditorDialogComponent } from './unit-editor-dialog.component';

interface PolicyForm {
  cancellationPolicyId: string;
  checkInTime: string;
  checkOutTime: string;
  houseRulesAr: string;
  damagePolicyAr: string;
}

function toForm(p: ManagedProperty): PolicyForm {
  const c = p.commercial;
  return {
    cancellationPolicyId: c.cancellationPolicy?.id ?? '',
    checkInTime: c.checkInTime ?? '',
    checkOutTime: c.checkOutTime ?? '',
    houseRulesAr: c.houseRulesAr ?? '',
    damagePolicyAr: c.damagePolicyAr ?? '',
  };
}

/** `false` while the editor is closed, `null` to add a unit, or the unit being edited. */
type EditorState = false | null | ManagedUnit;

/** Commercial layer: units (capacity, prices, Wi-Fi), cancellation policy, times and house rules. */
@Component({
  selector: 'app-commercial-tab',
  imports: [RouterLink, TranslatePipe, LocalizePipe, SarPipe, FieldComponent, IconComponent, SaveBarComponent, UnitEditorDialogComponent],
  templateUrl: './commercial-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommercialTabComponent {
  private readonly api = inject(HostPropertiesApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly catalog = inject(CatalogService);

  readonly property = input.required<ManagedProperty>();
  readonly saved = output<ManagedProperty>();
  /** Units were added, edited or removed — the property must be reloaded. */
  readonly changed = output<void>();

  protected readonly saving = new Mutation();
  protected readonly unitAction = new Mutation();
  protected readonly editor = signal<EditorState>(false);
  protected readonly form = linkedSignal(() => toForm(this.property()));
  protected readonly policy = computed(() => this.catalog.cancellationPolicies().find((c) => c.id === this.form().cancellationPolicyId));

  protected set<K extends keyof PolicyForm>(key: K, value: PolicyForm[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected save(): void {
    const f = this.form();
    const body = {
      cancellationPolicyId: f.cancellationPolicyId || null,
      checkInTime: f.checkInTime || null,
      checkOutTime: f.checkOutTime || null,
      houseRulesAr: f.houseRulesAr.trim() || null,
      damagePolicyAr: f.damagePolicyAr.trim() || null,
    };
    this.saving.run(this.api.update(this.property().id, body), (p) => {
      this.toast.success('operator.profile.commercial.saved');
      this.saved.emit(p);
    });
  }

  protected revert(): void {
    this.form.set(toForm(this.property()));
    this.toast.show('operator.profile.reverted');
  }

  protected onUnitSaved(): void {
    this.editor.set(false);
    this.changed.emit();
  }

  protected async removeUnit(unit: ManagedUnit): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'operator.unit.deleteTitle',
      message: 'operator.unit.deleteMessage',
      messageParams: { name: unit.name },
      okLabel: 'operator.unit.delete',
      danger: true,
    });
    if (!ok) return;
    this.unitAction.run(this.api.deleteUnit(unit.id), () => {
      this.toast.show('operator.unit.deleted');
      this.changed.emit();
    });
  }
}
