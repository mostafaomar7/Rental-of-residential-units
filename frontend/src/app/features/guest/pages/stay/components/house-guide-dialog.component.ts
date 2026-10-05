import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';

/** House guide and house rules of the stay's property, as written by the host (SRS STY — property guide). */
@Component({
  selector: 'app-house-guide-dialog',
  imports: [TranslatePipe, IconComponent, ModalComponent],
  template: `
    <app-modal size="lg" [title]="'account.stay.guide.title' | translate" [subtitle]="propertyName()" (closed)="closed.emit()">
      <div class="stack-sm">
        <div class="soft-lg">
          <div class="row bb"><app-icon name="book-open" class="gold-dark" />{{ 'account.stay.guide.title' | translate }}</div>
          <div class="small lh mt-4 pre-line">{{ guide() || ('account.stay.guide.empty' | translate) }}</div>
        </div>
        @if (houseRules()) {
          <div class="soft-lg">
            <div class="row bb"><app-icon name="scroll-text" class="gold-dark" />{{ 'guest.property.policies.rules.title' | translate }}</div>
            <div class="small lh mt-4 pre-line">{{ houseRules() }}</div>
          </div>
        }
      </div>
    </app-modal>
  `,
  styles: `
    .pre-line {
      white-space: pre-line;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HouseGuideDialogComponent {
  readonly propertyName = input.required<string>();
  readonly guide = input<string | null>(null);
  readonly houseRules = input<string | null>(null);
  readonly closed = output<void>();
}
