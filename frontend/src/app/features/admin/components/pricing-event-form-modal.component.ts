import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { City, PricingEvent, PricingEventBody, PricingEventType } from '@api/dto';
import { ToastService } from '@core/services/toast.service';
import { addDays, today } from '@core/utils/date.utils';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { ToggleComponent } from '@shared/ui/toggle/toggle.component';

export const PRICING_EVENT_TYPES: readonly PricingEventType[] = ['HOLIDAY', 'EVENT', 'SEASON', 'SCHOOL_HOLIDAY', 'OTHER'];
/** A price can at most be cut to zero; raises are capped server-side. */
const MIN_UPLIFT = -100;
const DEFAULT_UPLIFT = 10;
const DEFAULT_DURATION_DAYS = 3;

/** Add / edit an entry of the events & holidays calendar. No city selected = every city. */
@Component({
  selector: 'app-pricing-event-form-modal',
  imports: [FormsModule, TranslatePipe, LocalizePipe, ModalComponent, FieldComponent, ToggleComponent],
  template: `
    <app-modal size="lg" [title]="(isEdit() ? 'admin.pricing.editEvent' : 'admin.pricing.addEvent') | translate" (closed)="closed.emit()">
      <div class="grid g2">
        <app-field [label]="'admin.pricing.form.nameAr' | translate" for="ev-name-ar">
          <input id="ev-name-ar" class="input" dir="rtl" [(ngModel)]="nameAr" />
        </app-field>
        <app-field [label]="'admin.pricing.form.nameEn' | translate" for="ev-name-en">
          <input id="ev-name-en" class="input" dir="ltr" [(ngModel)]="nameEn" />
        </app-field>
        <app-field [label]="'admin.pricing.form.kind' | translate" for="ev-kind">
          <select id="ev-kind" class="select" [(ngModel)]="type">
            @for (k of types; track k) {
              <option [value]="k">{{ 'domain.api.pricingEventType.' + k | translate }}</option>
            }
          </select>
        </app-field>
        <app-field [label]="'admin.pricing.form.uplift' | translate" for="ev-uplift" [help]="'admin.pricing.form.upliftHelp' | translate">
          <input id="ev-uplift" class="input" type="number" [min]="minUplift" [(ngModel)]="uplift" />
        </app-field>
        <app-field [label]="'admin.pricing.form.from' | translate" for="ev-from">
          <input id="ev-from" class="input" type="date" [(ngModel)]="from" />
        </app-field>
        <app-field [label]="'admin.pricing.form.to' | translate" for="ev-to">
          <input id="ev-to" class="input" type="date" [(ngModel)]="to" />
        </app-field>
      </div>

      <div class="bb mt-12 mb-8">{{ 'admin.pricing.form.cities' | translate }}</div>
      <div class="chips">
        @for (c of cities(); track c.id) {
          <button type="button" class="chip chip-sm" [class.on]="cityIds().has(c.id)" [attr.aria-pressed]="cityIds().has(c.id)" (click)="toggleCity(c.id)">{{ c | loc }}</button>
        }
      </div>
      <div class="xs muted mt-4">{{ 'admin.pricing.form.citiesHelp' | translate }}</div>

      <div class="setting-row mt-8">
        <span class="b small">{{ 'admin.pricing.form.active' | translate }}</span>
        <app-toggle [(checked)]="isActive" [label]="'admin.pricing.form.active' | translate" />
      </div>
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="submit()">{{ (isEdit() ? 'common.save' : 'admin.pricing.add') | translate }}</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingEventFormModalComponent implements OnInit {
  private readonly toast = inject(ToastService);

  /** Event being edited; omit to add a new one. Read once when the dialog opens. */
  readonly event = input<PricingEvent | null>(null);
  readonly cities = input.required<readonly City[]>();
  readonly busy = input(false);
  readonly saved = output<PricingEventBody>();
  readonly closed = output<void>();

  protected readonly types = PRICING_EVENT_TYPES;
  protected readonly minUplift = MIN_UPLIFT;
  protected readonly isEdit = computed(() => !!this.event());

  protected readonly nameAr = signal('');
  protected readonly nameEn = signal('');
  protected readonly type = signal<PricingEventType>(PRICING_EVENT_TYPES[0]);
  protected readonly uplift = signal<number>(DEFAULT_UPLIFT);
  protected readonly from = signal(today());
  protected readonly to = signal(addDays(today(), DEFAULT_DURATION_DAYS));
  protected readonly cityIds = signal<ReadonlySet<Uuid>>(new Set());
  protected readonly isActive = signal(true);

  ngOnInit(): void {
    const e = this.event();
    if (!e) return;
    this.nameAr.set(e.nameAr);
    this.nameEn.set(e.nameEn);
    this.type.set(e.type);
    this.uplift.set(e.upliftPercent);
    this.from.set(e.startDate);
    this.to.set(e.endDate);
    this.cityIds.set(new Set(e.cityIds));
    this.isActive.set(e.isActive);
  }

  protected toggleCity(id: Uuid): void {
    this.cityIds.update((ids) => {
      const next = new Set(ids);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  protected submit(): void {
    const nameAr = this.nameAr().trim();
    const nameEn = this.nameEn().trim();
    const upliftPercent = Number(this.uplift());
    if (!nameAr || !nameEn) return this.toast.error('admin.pricing.form.nameRequired');
    if (!Number.isFinite(upliftPercent) || upliftPercent < MIN_UPLIFT) return this.toast.error('admin.pricing.form.upliftInvalid');
    if (!this.from() || !this.to() || this.to() < this.from()) return this.toast.error('admin.pricing.form.datesInvalid');
    this.saved.emit({
      nameAr,
      nameEn,
      type: this.type(),
      upliftPercent,
      startDate: this.from(),
      endDate: this.to(),
      cityIds: [...this.cityIds()],
      isActive: this.isActive(),
    });
  }
}
