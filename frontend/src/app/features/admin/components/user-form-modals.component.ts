import { ChangeDetectionStrategy, Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminUser, InviteUserBody, Role } from '@api/dto';
import { ToastService } from '@core/services/toast.service';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';

/** Every account role, in the order used by filters and role pickers. */
export const ALL_ROLES: readonly Role[] = ['GUEST', 'OWNER', 'OPERATOR', 'SUPERVISOR', 'PHOTOGRAPHER', 'ADMIN'];
/** Roles an invitation can grant (guests sign up themselves). */
export const STAFF_ROLES = ALL_ROLES.filter((r): r is InviteUserBody['role'] => r !== 'GUEST');

/** Saudi mobile as the API expects it: `05xxxxxxxx`. */
const MOBILE_PATTERN = /^05\d{8}$/;

/** Invites a staff member or partner by mobile (e-mail optional). */
@Component({
  selector: 'app-invite-user-modal',
  imports: [FormsModule, TranslatePipe, ModalComponent, FieldComponent],
  template: `
    <app-modal size="sm" [title]="'admin.users.inviteTitle' | translate" (closed)="closed.emit()">
      <div class="stack">
        <app-field [label]="'admin.users.name' | translate" for="ui-name">
          <input id="ui-name" class="input" [(ngModel)]="fullName" />
        </app-field>
        <app-field [label]="'admin.users.mobile' | translate" for="ui-mobile" [help]="'admin.users.mobileHelp' | translate">
          <input id="ui-mobile" class="input ltr" inputmode="tel" [(ngModel)]="mobile" />
        </app-field>
        <app-field [label]="'admin.users.email' | translate" for="ui-email">
          <input id="ui-email" class="input ltr" type="email" [(ngModel)]="email" />
        </app-field>
        <app-field [label]="'admin.users.role' | translate" for="ui-role">
          <select id="ui-role" class="select" [(ngModel)]="role">
            @for (r of roles; track r) {
              <option [value]="r">{{ 'domain.api.role.' + r | translate }}</option>
            }
          </select>
        </app-field>
      </div>
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="submit()">{{ 'admin.users.sendInvite' | translate }}</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteUserModalComponent {
  private readonly toast = inject(ToastService);

  readonly busy = input(false);
  readonly invited = output<InviteUserBody>();
  readonly closed = output<void>();

  protected readonly roles = STAFF_ROLES;
  protected readonly fullName = signal('');
  protected readonly mobile = signal('');
  protected readonly email = signal('');
  protected readonly role = signal<InviteUserBody['role']>(STAFF_ROLES[0]);

  protected submit(): void {
    const fullName = this.fullName().trim();
    const mobile = this.mobile().trim();
    const email = this.email().trim();
    if (!fullName) return this.toast.error('admin.users.nameRequired');
    if (!MOBILE_PATTERN.test(mobile)) return this.toast.error('admin.users.mobileInvalid');
    this.invited.emit({ fullName, mobile, role: this.role(), ...(email ? { email } : {}) });
  }
}

/** Changes the role of an existing account. */
@Component({
  selector: 'app-edit-role-modal',
  imports: [FormsModule, TranslatePipe, ModalComponent, FieldComponent],
  template: `
    <app-modal size="sm" [title]="'admin.users.editRoleTitle' | translate: { name: user().fullName }" (closed)="closed.emit()">
      <app-field [label]="'admin.users.role' | translate" for="ue-role">
        <select id="ue-role" class="select" [(ngModel)]="role">
          @for (r of roles; track r) {
            <option [value]="r">{{ 'domain.api.role.' + r | translate }}</option>
          }
        </select>
      </app-field>
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="busy() || role() === user().role" (click)="saved.emit(role())">{{ 'common.save' | translate }}</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditRoleModalComponent {
  readonly user = input.required<AdminUser>();
  readonly busy = input(false);
  readonly saved = output<Role>();
  readonly closed = output<void>();

  protected readonly roles = ALL_ROLES;
  protected readonly role = linkedSignal(() => this.user().role);
}
