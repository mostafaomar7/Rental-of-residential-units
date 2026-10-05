import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ConfirmService } from '@core/services/confirm.service';
import { ModalComponent } from '../modal/modal.component';

/** Renders the dialog requested through {@link ConfirmService}. Mounted once in the app root. */
@Component({
  selector: 'app-confirm-host',
  imports: [ModalComponent, TranslatePipe],
  template: `
    @if (confirm.pending(); as c) {
      <app-modal size="sm" [title]="(c.title ?? 'common.confirm') | translate" (closed)="confirm.settle(false)">
        <p class="lh">{{ c.message | translate: c.messageParams }}</p>
        <ng-container modal-footer>
          <button type="button" class="btn" [class]="c.danger ? 'btn-danger-solid' : 'btn-primary'" (click)="confirm.settle(true)">
            {{ (c.okLabel ?? 'common.confirm') | translate }}
          </button>
          <button type="button" class="btn btn-ghost" (click)="confirm.settle(false)">{{ 'common.cancel' | translate }}</button>
        </ng-container>
      </app-modal>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmHostComponent {
  protected readonly confirm = inject(ConfirmService);
}
