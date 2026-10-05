import { Routes } from '@angular/router';

/** Each portal is a lazily loaded route tree (see `features/<portal>/<portal>.routes.ts`). */
export const routes: Routes = [
  { path: 'login', title: 'auth.login.pageTitle', loadComponent: () => import('@features/auth/login.page').then((m) => m.LoginPage) },
  { path: 'operator', loadChildren: () => import('@features/operator/operator.routes').then((m) => m.OPERATOR_ROUTES) },
  { path: 'admin', loadChildren: () => import('@features/admin/admin.routes').then((m) => m.ADMIN_ROUTES) },
  { path: 'supervisor', loadChildren: () => import('@features/field/supervisor.routes').then((m) => m.SUPERVISOR_ROUTES) },
  { path: 'photographer', loadChildren: () => import('@features/field/photographer.routes').then((m) => m.PHOTOGRAPHER_ROUTES) },
  // Guest website last: it owns '' and the not-found page.
  { path: '', loadChildren: () => import('@features/guest/guest.routes').then((m) => m.GUEST_ROUTES) },
];
