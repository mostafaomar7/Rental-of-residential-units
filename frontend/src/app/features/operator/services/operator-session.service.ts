import { Injectable, computed, inject } from '@angular/core';
import { FINANCE_ROLES } from '@core/auth/roles';
import { AuthService } from '@core/services/auth.service';

/**
 * Who is using the host portal. Owners (and admins) see the owner view — finance screens and
 * operator management; operators manage day-to-day operations of the properties assigned to them.
 */
@Injectable({ providedIn: 'root' })
export class OperatorSessionService {
  private readonly auth = inject(AuthService);

  readonly user = this.auth.user;
  readonly role = this.auth.role;
  readonly userName = computed(() => this.user()?.fullName ?? '');
  /** Owner view: everything except what is reserved to the operator persona. */
  readonly isOwner = computed(() => this.role() !== 'OPERATOR');
  readonly hasFinance = computed(() => {
    const role = this.role();
    return !!role && FINANCE_ROLES.includes(role);
  });

  logout(): void {
    this.auth.logout('/');
  }
}
