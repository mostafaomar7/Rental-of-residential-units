import { Routes } from '@angular/router';
import { FINANCE_ROLES, PORTAL_ROLES } from '@core/auth/roles';
import { roleGuard } from '@core/guards/auth.guard';
import { OperatorLayoutComponent } from './layout/operator-layout.component';

export const OPERATOR_ROUTES: Routes = [
  {
    path: '',
    component: OperatorLayoutComponent,
    canActivate: [roleGuard(PORTAL_ROLES.operator)],
    children: [
      // Portfolio & revenue
      { path: '', title: 'operator.titles.dashboard', loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage) },
      { path: 'properties', title: 'operator.titles.properties', loadComponent: () => import('./pages/properties/properties.page').then((m) => m.PropertiesPage) },
      { path: 'property/:id', pathMatch: 'full', redirectTo: 'property/:id/identity' },
      { path: 'property/:id/:tab', title: 'operator.titles.propertyProfile', loadComponent: () => import('./pages/property-profile/property-profile.page').then((m) => m.PropertyProfilePage) },
      { path: 'add', title: 'operator.titles.addProperty', loadComponent: () => import('./pages/add-property/add-property.page').then((m) => m.AddPropertyPage) },
      { path: 'calendar', title: 'operator.titles.calendar', loadComponent: () => import('./pages/calendar/calendar.page').then((m) => m.CalendarPage) },
      { path: 'pricing', title: 'operator.titles.pricing', loadComponent: () => import('./pages/pricing/pricing.page').then((m) => m.PricingPage) },

      // Bookings & operations
      { path: 'bookings', title: 'operations.titles.bookings', loadComponent: () => import('./pages/bookings/bookings.page').then((m) => m.BookingsPage) },
      { path: 'booking/:id', title: 'operations.titles.booking', loadComponent: () => import('./pages/booking-detail/booking-detail.page').then((m) => m.BookingDetailPage) },
      { path: 'locks', title: 'operations.titles.locks', loadComponent: () => import('./pages/locks/locks.page').then((m) => m.LocksPage) },
      { path: 'ops', pathMatch: 'full', redirectTo: 'ops/tasks' },
      { path: 'ops/:tab', title: 'operations.titles.ops', loadComponent: () => import('./pages/ops/ops.page').then((m) => m.OpsPage) },
      { path: 'reviews', title: 'operations.titles.reviews', loadComponent: () => import('./pages/reviews/reviews.page').then((m) => m.ReviewsPage) },

      // Finance (owners only)
      {
        path: 'payouts',
        title: 'operations.titles.payouts',
        canActivate: [roleGuard(FINANCE_ROLES)],
        loadComponent: () => import('./pages/payouts/payouts.page').then((m) => m.PayoutsPage),
      },
    ],
  },
];
