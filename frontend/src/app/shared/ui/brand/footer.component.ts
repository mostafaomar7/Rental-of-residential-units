import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ToastService } from '@core/services/toast.service';
import { IconComponent } from '../icon/icon.component';

export const SUPPORT_WHATSAPP_URL = 'https://wa.me/966500000000';

/** Site footer. Portals pass `portalName` to replace the guest links with a portal label. */
@Component({
  selector: 'app-footer',
  imports: [IconComponent, TranslatePipe],
  template: `
    <footer class="foot">
      <div class="foot-in container">
        <div>{{ 'footer.tagline' | translate: { year: year } }}</div>
        <div class="row wrap gap-12">
          <span class="proto-tag"><app-icon name="flask-conical" size="sm" />{{ 'common.prototypeTag' | translate }}</span>
          @if (portalName()) {
            <span class="xs">{{ portalName() }}</span>
          } @else {
            <div class="links">
              <button type="button" (click)="toast.show('footer.privacyNotIncluded')">{{ 'footer.privacy' | translate }}</button>
              <button type="button" (click)="toast.show('footer.termsNotIncluded')">{{ 'footer.terms' | translate }}</button>
              <a [href]="whatsappUrl" target="_blank" rel="noopener">{{ 'footer.whatsappSupport' | translate }}</a>
            </div>
          }
        </div>
      </div>
    </footer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  protected readonly toast = inject(ToastService);
  /** Already-translated portal label; when set, guest links are hidden. */
  readonly portalName = input('');

  protected readonly year = new Date().getFullYear();
  protected readonly whatsappUrl = SUPPORT_WHATSAPP_URL;
}
