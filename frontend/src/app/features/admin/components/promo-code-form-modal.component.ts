import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { PromoCode, PromoCodeBody } from '@api/dto';
import { AdminBusinessApi } from '@api/endpoints/admin-business.api';
import { ToastService } from '@core/services/toast.service';
import { addDays, today } from '@core/utils/date.utils';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { ToggleComponent } from '@shared/ui/toggle/toggle.component';
import { endOfSaudiDay, saudiDate, startOfSaudiDay } from '../admin-dates';

/** Promo-code body; `code` is set on creation only. */
export type PromoCodeDraft = PromoCodeBody & { code?: string };

const CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;
const MAX_PERCENT = 100;
const DEFAULT_DURATION_DAYS = 30;
/** Campaigns offered in the link picker. */
const CAMPAIGN_OPTIONS = 100;

/** Number input value → number, or `null` when left empty. */
const optional = (value: number | null | string): number | null => (value === null || value === '' ? null : Number(value));

/** Creates a promo code or edits one (pass `promo`). Property targeting is kept as is. */
@Component({
  selector: 'app-promo-code-form-modal',
  imports: [FormsModule, TranslatePipe, ModalComponent, FieldComponent, ToggleComponent],
  template: `
    <app-modal size="lg" [title]="(isEdit() ? 'admin.promo.editTitle' : 'admin.promo.newTitle') | translate" (closed)="closed.emit()">
      <div class="grid g2">
        <app-field [label]="'admin.promo.form.code' | translate" for="pc-code" [help]="'admin.promo.form.codeHelp' | translate">
          <input id="pc-code" class="input ltr" [disabled]="isEdit()" [ngModel]="code()" (ngModelChange)="code.set($event.toUpperCase())" />
        </app-field>
        <app-field [label]="'admin.promo.form.campaign' | translate" for="pc-campaign">
          <select id="pc-campaign" class="select" [(ngModel)]="campaignId">
            <option value="">{{ 'admin.promo.form.noCampaign' | translate }}</option>
            @if (campaigns.hasValue()) {
              @for (c of campaigns.value().items; track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            }
          </select>
        </app-field>
        <app-field class="span-2" [label]="'admin.promo.form.description' | translate" for="pc-desc">
          <input id="pc-desc" class="input" [(ngModel)]="description" />
        </app-field>
        <app-field [label]="'admin.promo.form.type' | translate" for="pc-type">
          <select id="pc-type" class="select" [(ngModel)]="discountType">
            <option value="PERCENT">{{ 'admin.promo.types.PERCENT' | translate }}</option>
            <option value="FIXED">{{ 'admin.promo.types.FIXED' | translate }}</option>
          </select>
        </app-field>
        <app-field [label]="(discountType() === 'PERCENT' ? 'admin.promo.form.percent' : 'admin.promo.form.amount') | translate" for="pc-value">
          <input id="pc-value" class="input" type="number" min="0" [(ngModel)]="value" />
        </app-field>
        <app-field [label]="'admin.promo.form.maxDiscount' | translate" for="pc-max" [help]="'admin.promo.form.optional' | translate">
          <input id="pc-max" class="input" type="number" min="0" [(ngModel)]="maxDiscount" />
        </app-field>
        <app-field [label]="'admin.promo.form.minAccommodation' | translate" for="pc-min" [help]="'admin.promo.form.optional' | translate">
          <input id="pc-min" class="input" type="number" min="0" [(ngModel)]="minAccommodation" />
        </app-field>
        <app-field [label]="'admin.promo.form.from' | translate" for="pc-from">
          <input id="pc-from" class="input" type="date" [(ngModel)]="from" />
        </app-field>
        <app-field [label]="'admin.promo.form.to' | translate" for="pc-to">
          <input id="pc-to" class="input" type="date" [(ngModel)]="to" />
        </app-field>
        <app-field [label]="'admin.promo.form.usageLimit' | translate" for="pc-limit" [help]="'admin.promo.form.unlimitedHelp' | translate">
          <input id="pc-limit" class="input" type="number" min="1" [(ngModel)]="usageLimit" />
        </app-field>
        <app-field [label]="'admin.promo.form.perUser' | translate" for="pc-per-user">
          <input id="pc-per-user" class="input" type="number" min="1" [(ngModel)]="perUserLimit" />
        </app-field>
        <app-field [label]="'admin.promo.form.fundedBy' | translate" for="pc-funded">
          <select id="pc-funded" class="select" [(ngModel)]="fundedBy">
            <option value="PLATFORM">{{ 'admin.promo.funders.PLATFORM' | translate }}</option>
            <option value="OWNER">{{ 'admin.promo.funders.OWNER' | translate }}</option>
          </select>
        </app-field>
      </div>
      <div class="setting-row mt-8">
        <span class="b small">{{ 'admin.promo.form.firstBookingOnly' | translate }}</span>
        <app-toggle [(checked)]="firstBookingOnly" [label]="'admin.promo.form.firstBookingOnly' | translate" />
      </div>
      <div class="setting-row">
        <span class="b small">{{ 'admin.promo.form.active' | translate }}</span>
        <app-toggle [(checked)]="isActive" [label]="'admin.promo.form.active' | translate" />
      </div>
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="submit()">{{ (isEdit() ? 'common.save' : 'admin.promo.form.create') | translate }}</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  styles: `
    .span-2 {
      grid-column: 1 / -1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromoCodeFormModalComponent implements OnInit {
  private readonly api = inject(AdminBusinessApi);
  private readonly toast = inject(ToastService);

  /** Code being edited; omit to create one. Read once when the dialog opens. */
  readonly promo = input<PromoCode | null>(null);
  readonly busy = input(false);
  readonly saved = output<PromoCodeDraft>();
  readonly closed = output<void>();

  protected readonly isEdit = computed(() => !!this.promo());
  protected readonly campaigns = rxResource({ stream: () => this.api.campaigns({ limit: CAMPAIGN_OPTIONS }) });

  protected readonly code = signal('');
  protected readonly campaignId = signal('');
  protected readonly description = signal('');
  protected readonly discountType = signal<PromoCode['discountType']>('PERCENT');
  protected readonly value = signal<number | null>(null);
  protected readonly maxDiscount = signal<number | null>(null);
  protected readonly minAccommodation = signal<number | null>(null);
  protected readonly from = signal(today());
  protected readonly to = signal(addDays(today(), DEFAULT_DURATION_DAYS));
  protected readonly usageLimit = signal<number | null>(null);
  protected readonly perUserLimit = signal<number>(1);
  protected readonly fundedBy = signal<PromoCode['fundedBy']>('PLATFORM');
  protected readonly firstBookingOnly = signal(false);
  protected readonly isActive = signal(true);

  ngOnInit(): void {
    const p = this.promo();
    if (!p) return;
    this.code.set(p.code);
    this.campaignId.set(p.campaign?.id ?? '');
    this.description.set(p.descriptionAr ?? '');
    this.discountType.set(p.discountType);
    this.value.set(p.value);
    this.maxDiscount.set(p.maxDiscount);
    this.minAccommodation.set(p.minAccommodation);
    this.from.set(saudiDate(p.startsAt));
    this.to.set(saudiDate(p.endsAt));
    this.usageLimit.set(p.usageLimit);
    this.perUserLimit.set(p.perUserLimit);
    this.fundedBy.set(p.fundedBy);
    this.firstBookingOnly.set(p.firstBookingOnly);
    this.isActive.set(p.isActive);
  }

  protected submit(): void {
    const code = this.code().trim();
    const value = Number(this.value());
    const perUserLimit = Number(this.perUserLimit());
    if (!this.isEdit() && !CODE_PATTERN.test(code)) return this.toast.error('admin.promo.form.codeInvalid');
    if (!(value > 0) || (this.discountType() === 'PERCENT' && value > MAX_PERCENT)) return this.toast.error('admin.promo.form.valueInvalid');
    if (!(perUserLimit >= 1)) return this.toast.error('admin.promo.form.valueInvalid');
    if (!this.from() || !this.to() || this.to() < this.from()) return this.toast.error('admin.promo.form.datesInvalid');

    const body: PromoCodeDraft = {
      campaignId: this.campaignId() || null,
      descriptionAr: this.description().trim() || null,
      discountType: this.discountType(),
      value,
      maxDiscount: optional(this.maxDiscount()),
      minAccommodation: optional(this.minAccommodation()),
      startsAt: startOfSaudiDay(this.from()),
      endsAt: endOfSaudiDay(this.to()),
      usageLimit: optional(this.usageLimit()),
      perUserLimit,
      fundedBy: this.fundedBy(),
      firstBookingOnly: this.firstBookingOnly(),
      isActive: this.isActive(),
    };
    this.saved.emit(this.isEdit() ? body : { ...body, code });
  }
}
