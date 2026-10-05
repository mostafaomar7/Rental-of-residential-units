import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { PhotographerShellComponent } from '../../../components/field-shells.component';
import { ProfileCardComponent } from '../../../components/profile-card.component';

/** Photography standards shown in the guide (keys under `field.photographer.me.guide.rules`). */
const GUIDE_RULES = ['resolution', 'lighting', 'verticals', 'declutter', 'lock', 'noFilters'] as const;

/** `/photographer/me` — profile, the photography standards guide and sign-out. */
@Component({
  selector: 'app-photographer-me-page',
  imports: [TranslatePipe, ModalComponent, PhotographerShellComponent, ProfileCardComponent],
  template: `
    <app-photographer-shell [title]="'field.common.me' | translate" [subtitle]="'field.photographer.appName' | translate">
      <app-profile-card>
        <div class="card card-p mt-12">
          <div class="setting-row">
            <div class="b small">{{ 'field.photographer.me.guideLabel' | translate }}</div>
            <button type="button" class="link small" (click)="guideOpen.set(true)">{{ 'field.photographer.me.view' | translate }}</button>
          </div>
        </div>
      </app-profile-card>

      @if (guideOpen()) {
        <app-modal size="sm" [title]="'field.photographer.me.guide.title' | translate" (closed)="guideOpen.set(false)">
          <div class="stack-sm small">
            @for (rule of rules; track rule) {
              <div class="row-top rule"><span class="gold">✓</span>{{ 'field.photographer.me.guide.rules.' + rule | translate }}</div>
            }
          </div>
        </app-modal>
      }
    </app-photographer-shell>
  `,
  styles: `
    .rule {
      gap: 8px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotographerMePage {
  protected readonly rules = GUIDE_RULES;
  protected readonly guideOpen = signal(false);
}
