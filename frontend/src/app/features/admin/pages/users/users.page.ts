import { ChangeDetectionStrategy, Component, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { AdminUser, InviteUserBody, Role, UserStatus } from '@api/dto';
import { AdminPlatformApi } from '@api/endpoints/admin-platform.api';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { PagerComponent } from '../../components/pager.component';
import { ResourceStateComponent } from '../../components/resource-state.component';
import { UserBalancesModalComponent } from '../../components/user-balances-modal.component';
import { ALL_ROLES, EditRoleModalComponent, InviteUserModalComponent } from '../../components/user-form-modals.component';

const STATUSES: readonly UserStatus[] = ['ACTIVE', 'SUSPENDED'];
const PAGE_SIZE = 20;

/** `/admin/users?q=` — accounts: search & filters, invitations, role changes, suspension, guest balances. */
@Component({
  selector: 'app-users-page',
  imports: [
    FormsModule,
    TranslatePipe,
    FORMAT_PIPES,
    PageHeaderComponent,
    StatusPillComponent,
    EmptyStateComponent,
    IconComponent,
    PagerComponent,
    ResourceStateComponent,
    InviteUserModalComponent,
    EditRoleModalComponent,
    UserBalancesModalComponent,
  ],
  templateUrl: './users.page.html',
  styles: `
    .search-box {
      max-width: 300px;
    }
    .filter {
      width: auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPage {
  private readonly api = inject(AdminPlatformApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  /** Search text from the header search box (`?q=`). */
  readonly q = input<string>();

  protected readonly roles = ALL_ROLES;
  protected readonly statuses = STATUSES;

  protected readonly search = linkedSignal(() => this.q()?.trim() ?? '');
  protected readonly role = signal<Role | ''>('');
  protected readonly status = signal<UserStatus | ''>('');
  protected readonly currentPage = linkedSignal({ source: () => [this.search(), this.role(), this.status()], computation: () => 1 });

  protected readonly inviting = signal(false);
  protected readonly editing = signal<AdminUser | null>(null);
  protected readonly balancesOf = signal<AdminUser | null>(null);
  protected readonly busy = signal(false);

  protected readonly users = rxResource({
    params: () => ({ search: this.search() || undefined, role: this.role() || undefined, status: this.status() || undefined, page: this.currentPage(), limit: PAGE_SIZE }),
    stream: ({ params }) => this.api.users(params),
  });

  protected invite(body: InviteUserBody): void {
    this.mutate(this.api.inviteUser(body), 'admin.users.invited', { name: body.fullName }, () => this.inviting.set(false));
  }

  protected changeRole(user: AdminUser, role: Role): void {
    this.mutate(this.api.changeRole(user.id, role), 'admin.users.roleUpdated', { name: user.fullName }, () => this.editing.set(null));
  }

  protected async toggleSuspension(user: AdminUser): Promise<void> {
    const suspending = user.status === 'ACTIVE';
    const ok = await this.confirm.ask({
      title: suspending ? 'admin.users.suspendTitle' : 'admin.users.activateTitle',
      message: suspending ? 'admin.users.suspendMessage' : 'admin.users.activateMessage',
      messageParams: { name: user.fullName },
      okLabel: suspending ? 'admin.users.suspendOk' : 'admin.users.activate',
      danger: suspending,
    });
    if (!ok) return;
    const request = suspending ? this.api.suspendUser(user.id) : this.api.reactivateUser(user.id);
    this.mutate(request, suspending ? 'admin.users.suspended' : 'admin.users.activated', { name: user.fullName });
  }

  private mutate(request: Observable<AdminUser>, successKey: string, params: Record<string, unknown>, onDone?: () => void): void {
    this.busy.set(true);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        onDone?.();
        this.toast.success(successKey, params);
        this.users.reload();
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
