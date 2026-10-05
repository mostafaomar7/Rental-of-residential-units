import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { MeApi } from '@api/endpoints/me.api';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { ModalComponent } from '@shared/ui/modal/modal.component';

/** PDPL account deletion, guarded by typing a confirmation word; signs the guest out. */
@Component({
  selector: 'app-delete-account-dialog',
  imports: [TranslatePipe, ModalComponent],
  template: `
    <app-modal size="sm" [title]="'account.settings.deleteTitle' | translate" (closed)="closed.emit()">
      <p class="lh" [innerHTML]="'account.settings.deleteMessage' | translate: { word: ('account.settings.deleteWord' | translate) }"></p>
      <input
        class="input mt-12"
        [attr.aria-label]="'account.settings.deleteWordLabel' | translate"
        [placeholder]="'account.settings.deleteWord' | translate"
        [value]="typed()"
        (input)="typed.set($any($event.target).value)"
        (keydown.enter)="confirm()"
      />
      <ng-container modal-footer>
        <button type="button" class="btn btn-danger-solid" [disabled]="busy()" (click)="confirm()">{{ 'account.settings.deleteAccount' | translate }}</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteAccountDialogComponent {
  private readonly meApi = inject(MeApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly closed = output<void>();

  protected readonly typed = signal('');
  protected readonly busy = signal(false);

  protected confirm(): void {
    const word = this.translate.instant('account.settings.deleteWord');
    if (this.typed().trim() !== word) {
      this.toast.error('account.settings.deleteWordMismatch', { word });
      return;
    }
    this.busy.set(true);
    this.meApi.deleteAccount().subscribe({
      next: () => {
        this.busy.set(false);
        this.closed.emit();
        this.auth.logout();
        this.toast.show('account.settings.deleted');
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
