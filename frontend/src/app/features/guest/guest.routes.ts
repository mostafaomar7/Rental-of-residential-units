import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { GuestLayoutComponent } from './layout/guest-layout.component';

export const GUEST_ROUTES: Routes = [
  {
    path: '',
    component: GuestLayoutComponent,
    children: [
      // Discovery
      { path: '', title: 'guest.titles.home', loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage) },
      { path: 'search', title: 'guest.titles.search', loadComponent: () => import('./pages/search/search.page').then((m) => m.SearchPage) },
      { path: 'property/:id', title: 'guest.titles.property', loadComponent: () => import('./pages/property/property.page').then((m) => m.PropertyPage) },

      // Booking & account
      { path: 'book/:id', title: 'account.titles.booking', loadComponent: () => import('./pages/booking/booking.page').then((m) => m.BookingPage) },
      {
        path: 'account',
        canActivate: [authGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'overview' },
          { path: ':tab', title: 'account.titles.account', loadComponent: () => import('./pages/account/account.page').then((m) => m.AccountPage) },
        ],
      },
      { path: 'stay/:id', canActivate: [authGuard], title: 'account.titles.stay', loadComponent: () => import('./pages/stay/stay.page').then((m) => m.StayPage) },
      { path: 'review/:id', canActivate: [authGuard], title: 'account.titles.review', loadComponent: () => import('./pages/review/review.page').then((m) => m.ReviewPage) },
      { path: 'invoice/:id', canActivate: [authGuard], title: 'account.titles.invoice', loadComponent: () => import('./pages/invoice/invoice.page').then((m) => m.InvoicePage) },

      // Payments — the gateway returns the browser here.
      {
        path: 'payments/not-found',
        title: 'guest.titles.payment',
        loadComponent: () => import('./pages/payment/payment-not-found.page').then((m) => m.PaymentNotFoundPage),
      },
      {
        path: 'payments/:paymentId/result',
        canActivate: [authGuard],
        title: 'guest.titles.payment',
        loadComponent: () => import('./pages/payment/payment-result.page').then((m) => m.PaymentResultPage),
      },
      // Development gateway (backends with PAYMENT_DRIVER=test).
      {
        path: 'test-gateway/:cartId',
        canActivate: [authGuard],
        title: 'guest.titles.testGateway',
        loadComponent: () => import('./pages/payment/test-gateway.page').then((m) => m.TestGatewayPage),
      },

      { path: '**', title: 'common.notFound.title', loadComponent: () => import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage) },
    ],
  },
];
