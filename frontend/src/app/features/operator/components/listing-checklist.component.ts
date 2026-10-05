import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PropertyChecklist } from '@api/dto';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { IconComponent } from '@shared/ui/icon/icon.component';

/** Older APIs send no labels: these keys are translated locally; others show the API's (English) message. */
const KNOWN_KEYS = new Set(['basics', 'location', 'description', 'units', 'amenities', 'photos', 'policies', 'operatingModel', 'license', 'ownership']);

/** Publication checklist of a property (`GET /host/properties/:id/checklist`). */
@Component({
  selector: 'app-listing-checklist',
  imports: [TranslatePipe, LocalizePipe, IconComponent],
  template: `
    <div class="stack-sm">
      @for (item of items(); track item.key) {
        <div class="check-item" [class.done]="item.ok">
          <span class="cb">
            @if (item.ok) {
              <app-icon name="check" size="sm" />
            }
          </span>
          <span class="t">
            @if (item.labelAr) {
              {{ item | loc: 'label' }}
            } @else {
              {{ known(item.key) ? ('operator.checklist.' + item.key | translate) : item.message }}
            }
            @if (item.required != null && item.current != null) {
              <span class="muted ltr">({{ item.current }}/{{ item.required }})</span>
            }
          </span>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingChecklistComponent {
  readonly items = input.required<PropertyChecklist['items']>();

  protected known(key: string): boolean {
    return KNOWN_KEYS.has(key);
  }
}
