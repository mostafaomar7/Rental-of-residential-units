import { Routes } from '@angular/router';
import { PORTAL_ROLES } from '@core/auth/roles';
import { roleGuard } from '@core/guards/auth.guard';

/** Photographer field app — each page renders its own `<app-photographer-shell>`. */
export const PHOTOGRAPHER_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard(PORTAL_ROLES.photographer)],
    children: [
      { path: '', title: 'field.titles.photographerShoots', loadComponent: () => import('./pages/photographer/shoots/photographer-shoots.page').then((m) => m.PhotographerShootsPage) },
      { path: 'shoot/:id', title: 'field.titles.photographerShoot', loadComponent: () => import('./pages/photographer/shoot/photographer-shoot.page').then((m) => m.PhotographerShootPage) },
      { path: 'me', title: 'field.titles.photographerMe', loadComponent: () => import('./pages/photographer/me/photographer-me.page').then((m) => m.PhotographerMePage) },
    ],
  },
];
