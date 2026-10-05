import { Routes } from '@angular/router';
import { PORTAL_ROLES } from '@core/auth/roles';
import { roleGuard } from '@core/guards/auth.guard';
import { AdminLayoutComponent } from './layout/admin-layout.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [roleGuard(PORTAL_ROLES.admin)],
    children: [
      { path: '', title: 'admin.titles.overview', loadComponent: () => import('./pages/overview/overview.page').then((m) => m.OverviewPage) },
      { path: 'verification', title: 'admin.titles.verification', loadComponent: () => import('./pages/verification/verification.page').then((m) => m.VerificationPage) },
      { path: 'photos', title: 'admin.titles.photos', loadComponent: () => import('./pages/photo-qa/photo-qa.page').then((m) => m.PhotoQaPage) },
      { path: 'disputes', title: 'admin.titles.disputes', loadComponent: () => import('./pages/disputes/disputes.page').then((m) => m.DisputesPage) },
      { path: 'bookings', title: 'admin.titles.bookings', loadComponent: () => import('./pages/bookings/bookings.page').then((m) => m.AdminBookingsPage) },
      { path: 'finance', title: 'admin.titles.finance', loadComponent: () => import('./pages/finance/finance.page').then((m) => m.FinancePage) },
      { path: 'users', title: 'admin.titles.users', loadComponent: () => import('./pages/users/users.page').then((m) => m.UsersPage) },
      { path: 'campaigns', title: 'admin.titles.campaigns', loadComponent: () => import('./pages/campaigns/campaigns.page').then((m) => m.AdminCampaignsPage) },
      { path: 'integrations', title: 'admin.titles.integrations', loadComponent: () => import('./pages/integrations/integrations.page').then((m) => m.IntegrationsPage) },
      { path: 'pricing', title: 'admin.titles.pricing', loadComponent: () => import('./pages/pricing/pricing-events.page').then((m) => m.PricingEventsPage) },
      { path: 'settings', title: 'admin.titles.settings', loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage) },
      { path: 'audit', title: 'admin.titles.audit', loadComponent: () => import('./pages/audit/audit.page').then((m) => m.AuditPage) },
    ],
  },
];
