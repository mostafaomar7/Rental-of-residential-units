import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CancellationRule } from '@api/dto';
import { ToastService } from '@core/services/toast.service';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { ToggleComponent } from '@shared/ui/toggle/toggle.component';

/** Which catalog list the form edits: decides the extra fields shown. */
export type CatalogKind = 'city' | 'property-types' | 'amenities' | 'cancellation-policies';

/** Union of the editable catalog fields; each kind uses its own subset. */
export interface CatalogDraft {
  nameAr: string;
  nameEn: string;
  isActive: boolean;
  sortOrder: number;
  /** Cities. */
  slug?: string;
  /** Types, amenities, policies. */
  code?: string;
  /** Amenities (Lucide icon name). */
  icon?: string | null;
  /** Cancellation policies. */
  descriptionAr?: string;
  descriptionEn?: string;
  rules?: CancellationRule[];
}

/** Existing item handed to the form (API rows: English texts may be null). */
export type CatalogItemValue = Partial<Omit<CatalogDraft, 'nameEn' | 'descriptionEn'>> & { nameEn?: string | null; descriptionEn?: string | null };

const KEY_PATTERN = /^[a-z0-9_-]+$/i;
const MAX_REFUND = 100;

/** Add / edit a city, property type, amenity or cancellation policy (with its refund rules). */
@Component({
  selector: 'app-catalog-item-form-modal',
  imports: [FormsModule, TranslatePipe, ModalComponent, FieldComponent, IconComponent, ToggleComponent],
  template: `
    <app-modal size="lg" [title]="'admin.catalog.form.' + (isEdit() ? 'edit' : 'add') + '.' + kind() | translate" (closed)="closed.emit()">
      <div class="grid g2">
        <app-field [label]="'admin.catalog.form.nameAr' | translate" for="ci-name-ar">
          <input id="ci-name-ar" class="input" dir="rtl" [(ngModel)]="nameAr" />
        </app-field>
        <app-field [label]="'admin.catalog.form.nameEn' | translate" for="ci-name-en">
          <input id="ci-name-en" class="input" dir="ltr" [(ngModel)]="nameEn" />
        </app-field>
        <app-field [label]="(kind() === 'city' ? 'admin.catalog.form.slug' : 'admin.catalog.form.code') | translate" for="ci-key" [help]="'admin.catalog.form.keyHelp' | translate">
          <input id="ci-key" class="input ltr" [(ngModel)]="key" />
        </app-field>
        <app-field [label]="'admin.catalog.form.sortOrder' | translate" for="ci-sort">
          <input id="ci-sort" class="input" type="number" [(ngModel)]="sortOrder" />
        </app-field>
        @if (kind() === 'amenities') {
          <app-field [label]="'admin.catalog.form.icon' | translate" for="ci-icon" [help]="'admin.catalog.form.iconHelp' | translate">
            <input id="ci-icon" class="input ltr" [(ngModel)]="icon" />
          </app-field>
        }
      </div>

      @if (kind() === 'cancellation-policies') {
        <app-field class="mt-12" [label]="'admin.catalog.form.descriptionAr' | translate" for="ci-desc-ar">
          <textarea id="ci-desc-ar" class="textarea" dir="rtl" [(ngModel)]="descriptionAr"></textarea>
        </app-field>
        <app-field [label]="'admin.catalog.form.descriptionEn' | translate" for="ci-desc-en">
          <textarea id="ci-desc-en" class="textarea" dir="ltr" [(ngModel)]="descriptionEn"></textarea>
        </app-field>

        <div class="row between mt-12 mb-8">
          <span class="bb">{{ 'admin.catalog.rules.title' | translate }}</span>
          <button type="button" class="btn btn-ghost btn-xs" (click)="addRule()"><app-icon name="plus" size="sm" />{{ 'admin.catalog.rules.add' | translate }}</button>
        </div>
        <div class="stack-sm">
          @for (rule of rules(); track $index; let i = $index) {
            <div class="row rule">
              <app-field [label]="'admin.catalog.rules.hours' | translate" [for]="'rule-h-' + i">
                <input class="input" type="number" min="0" [id]="'rule-h-' + i" [ngModel]="rule.minHoursBefore" (ngModelChange)="setRule(i, { minHoursBefore: $event })" />
              </app-field>
              <app-field [label]="'admin.catalog.rules.refund' | translate" [for]="'rule-r-' + i">
                <input class="input" type="number" min="0" max="100" [id]="'rule-r-' + i" [ngModel]="rule.refundPercent" (ngModelChange)="setRule(i, { refundPercent: $event })" />
              </app-field>
              <button type="button" class="btn btn-danger btn-icon btn-xs" [attr.aria-label]="'admin.catalog.rules.remove' | translate" (click)="removeRule(i)">
                <app-icon name="trash-2" size="sm" />
              </button>
            </div>
          } @empty {
            <p class="small muted">{{ 'admin.catalog.rules.empty' | translate }}</p>
          }
        </div>
      }

      <div class="setting-row mt-8">
        <span class="b small">{{ 'admin.catalog.form.active' | translate }}</span>
        <app-toggle [(checked)]="isActive" [label]="'admin.catalog.form.active' | translate" />
      </div>
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="submit()">{{ (isEdit() ? 'common.save' : 'admin.catalog.add') | translate }}</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  styles: `
    .rule {
      align-items: end;
    }
    .rule app-field {
      flex: 1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogItemFormModalComponent implements OnInit {
  private readonly toast = inject(ToastService);

  readonly kind = input.required<CatalogKind>();
  /** Item being edited; omit to add one. Read once when the dialog opens. */
  readonly item = input<CatalogItemValue | null>(null);
  readonly busy = input(false);
  readonly saved = output<CatalogDraft>();
  readonly closed = output<void>();

  protected readonly isEdit = computed(() => !!this.item());

  protected readonly nameAr = signal('');
  protected readonly nameEn = signal('');
  protected readonly key = signal('');
  protected readonly sortOrder = signal(0);
  protected readonly icon = signal('');
  protected readonly descriptionAr = signal('');
  protected readonly descriptionEn = signal('');
  protected readonly rules = signal<CancellationRule[]>([]);
  protected readonly isActive = signal(true);

  ngOnInit(): void {
    const item = this.item();
    if (!item) return;
    this.nameAr.set(item.nameAr ?? '');
    this.nameEn.set(item.nameEn ?? '');
    this.key.set(item.slug ?? item.code ?? '');
    this.sortOrder.set(item.sortOrder ?? 0);
    this.icon.set(item.icon ?? '');
    this.descriptionAr.set(item.descriptionAr ?? '');
    this.descriptionEn.set(item.descriptionEn ?? '');
    this.rules.set((item.rules ?? []).map((r) => ({ ...r })));
    this.isActive.set(item.isActive ?? true);
  }

  protected addRule(): void {
    this.rules.update((rules) => [...rules, { minHoursBefore: 0, refundPercent: 0 }]);
  }

  protected setRule(index: number, change: Partial<CancellationRule>): void {
    this.rules.update((rules) => rules.map((r, i) => (i === index ? { ...r, ...change } : r)));
  }

  protected removeRule(index: number): void {
    this.rules.update((rules) => rules.filter((_, i) => i !== index));
  }

  protected submit(): void {
    const nameAr = this.nameAr().trim();
    const nameEn = this.nameEn().trim();
    const key = this.key().trim();
    if (!nameAr || !nameEn) return this.toast.error('admin.catalog.form.namesRequired');
    if (!KEY_PATTERN.test(key)) return this.toast.error('admin.catalog.form.keyInvalid');

    const draft: CatalogDraft = { nameAr, nameEn, sortOrder: Number(this.sortOrder()) || 0, isActive: this.isActive() };
    const kind = this.kind();
    if (kind === 'city') draft.slug = key;
    else draft.code = key;
    if (kind === 'amenities') draft.icon = this.icon().trim() || null;
    if (kind === 'cancellation-policies') {
      const rules = this.rules().map((r) => ({ minHoursBefore: Number(r.minHoursBefore), refundPercent: Number(r.refundPercent) }));
      const invalid = rules.some((r) => !(r.minHoursBefore >= 0) || !(r.refundPercent >= 0 && r.refundPercent <= MAX_REFUND));
      if (!this.descriptionAr().trim() || invalid) return this.toast.error('admin.catalog.form.policyInvalid');
      draft.descriptionAr = this.descriptionAr().trim();
      draft.descriptionEn = this.descriptionEn().trim();
      draft.rules = rules.sort((a, b) => b.minHoursBefore - a.minHoursBefore);
    }
    this.saved.emit(draft);
  }
}
