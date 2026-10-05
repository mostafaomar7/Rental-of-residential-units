import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LangService } from '@core/services/lang.service';
import { IconComponent } from '../icon/icon.component';

/** Header button that switches between Arabic and English. */
@Component({
  selector: 'app-lang-switch',
  imports: [IconComponent, TranslatePipe],
  template: `
    <button type="button" class="hbtn lang-btn" [attr.aria-label]="'common.switchLanguage' | translate" (click)="lang.toggle()">
      <app-icon name="languages" size="sm" />
      <span class="xs b">{{ 'common.otherLanguage' | translate }}</span>
    </button>
  `,
  styles: `
    .lang-btn {
      width: auto;
      padding: 0 10px;
      gap: 4px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LangSwitchComponent {
  protected readonly lang = inject(LangService);
}
