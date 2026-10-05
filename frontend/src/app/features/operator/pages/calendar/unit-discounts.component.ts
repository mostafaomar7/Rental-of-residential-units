import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { Discount } from '@api/dto';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { today } from '@core/utils/date.utils';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoadErrorComponent, LoadingComponent } from '../../components/async-state.component';
import { Mutation } from '../../services/mutation';

/** Date-range discounts of a unit (shown to guests as a discount badge): list, add, remove. */
@Component({
  selector: 'app-unit-discounts',
  imports: [FormsModule, TranslatePipe, AppDatePipe, FieldComponent, IconComponent, LoadingComponent, LoadErrorComponent],
  template: `
    <div class="card-h">
      <h3>{{ 'operator.discounts.title' | translate }}</h3>
    </div>
    @if (resource.isLoading()) {
      <app-loading />
    } @else if (resource.error()) {
      <app-load-error [error]="resource.error()" (retry)="resource.reload()" />
    } @else if (resource.hasValue()) {
      <div class="rows">
        @for (d of resource.value(); track d.id) {
          <div class="row between discount">
            <div>
              <div class="b small">{{ 'operator.discounts.percent' | translate: { value: d.percent } }} @if (d.label) { • {{ d.label }} }</div>
              <div class="xs muted">{{ 'operator.common.range' | translate: { from: (d.startDate | appDate), to: (d.endDate | appDate) } }}</div>
            </div>
            <button type="button" class="btn btn-danger btn-xs" [disabled]="saving.busy()" [attr.aria-label]="'operator.discounts.remove' | translate" (click)="remove(d)">
              <app-icon name="trash-2" size="sm" />
            </button>
          </div>
        } @empty {
          <div class="xs muted">{{ 'operator.discounts.empty' | translate }}</div>
        }
      </div>
    }

    <div class="grid g2 mt-16">
      <app-field [label]="'operator.discounts.percentLabel' | translate" for="ud-percent">
        <input id="ud-percent" class="input" type="number" min="1" max="90" [(ngModel)]="percent" />
      </app-field>
      <app-field [label]="'operator.discounts.label' | translate" for="ud-label">
        <input id="ud-label" class="input" [(ngModel)]="label" />
      </app-field>
      <app-field [label]="'operator.discounts.from' | translate" for="ud-from">
        <input id="ud-from" class="input" type="date" [min]="today" [(ngModel)]="startDate" />
      </app-field>
      <app-field [label]="'operator.discounts.to' | translate" for="ud-to">
        <input id="ud-to" class="input" type="date" [min]="startDate() || today" [(ngModel)]="endDate" />
      </app-field>
    </div>
    <button type="button" class="btn btn-primary btn-sm" [disabled]="saving.busy() || !valid()" (click)="add()">
      <app-icon name="plus" size="sm" />{{ 'operator.discounts.add' | translate }}
    </button>
  `,
  styles: `
    :host {
      display: block;
    }
    .discount {
      padding: 8px 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitDiscountsComponent {
  private readonly api = inject(HostPropertiesApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly unitId = input.required<Uuid>();
  /** Discounts changed — calendar prices must be reloaded. */
  readonly changed = output<void>();

  protected readonly today = today();
  protected readonly percent = signal<number | null>(null);
  protected readonly label = signal('');
  protected readonly startDate = signal('');
  protected readonly endDate = signal('');
  protected readonly saving = new Mutation();

  protected readonly resource = rxResource({
    params: () => this.unitId(),
    stream: ({ params }) => this.api.discounts(params),
  });

  protected readonly valid = computed(() => {
    const percent = this.percent() ?? 0;
    return percent > 0 && percent < 100 && !!this.startDate() && !!this.endDate() && this.endDate() >= this.startDate();
  });

  protected add(): void {
    if (!this.valid()) return;
    const body = { percent: this.percent() ?? 0, startDate: this.startDate(), endDate: this.endDate(), label: this.label().trim() || null };
    this.saving.run(this.api.addDiscount(this.unitId(), body), (discount) => {
      this.resource.update((list) => [...(list ?? []), discount]);
      this.percent.set(null);
      this.label.set('');
      this.toast.success('operator.discounts.added');
      this.changed.emit();
    });
  }

  protected async remove(discount: Discount): Promise<void> {
    const ok = await this.confirm.ask({ message: 'operator.discounts.removeConfirm', messageParams: { value: discount.percent }, danger: true });
    if (!ok) return;
    this.saving.run(this.api.removeDiscount(discount.id), () => {
      this.resource.update((list) => list?.filter((d) => d.id !== discount.id));
      this.toast.show('operator.discounts.removed');
      this.changed.emit();
    });
  }
}
