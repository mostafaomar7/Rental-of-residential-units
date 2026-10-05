import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '@api/dto';
import { AuthService } from '@core/services/auth.service';

/** Guest-only pages: visitors are sent home with the login dialog open, then returned here. */
export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  await auth.applyDemoLogin(route.queryParamMap.get('as'));
  if (auth.isLoggedIn()) return true;
  auth.requestLogin(state.url);
  return inject(Router).parseUrl('/');
};

/**
 * Staff portals: requires one of `roles`. Signed-out users go to `/login`; a signed-in user
 * with another role is sent to their own portal.
 */
export function roleGuard(roles: readonly Role[]): CanActivateFn {
  return async (route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.applyDemoLogin(route.queryParamMap.get('as'));
    const role = auth.role();
    if (!role) return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
    return roles.includes(role) ? true : router.parseUrl(auth.homeFor(role));
  };
}
