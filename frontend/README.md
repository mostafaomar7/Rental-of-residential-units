# Rawaaf — Angular front end

Angular 20 front end of the Rawaaf short-stay & smart-operations platform: guest website, owner /
operator portal, field apps (supervisor, photographer) and platform admin console. The design comes
from the clickable prototype in `../prototype/` (reference only — left untouched); the business rules
from the SRS in `../docs/srs/`.

All data comes from the Rawaaf REST API (`/api/v1`). How the app talks to it — layers, conventions,
booking/payment flows — is in **[docs/API_INTEGRATION.md](docs/API_INTEGRATION.md)**.

## Run

```bash
npm install
npm start            # ng serve → http://localhost:4200, proxies /api and /uploads to the backend
npm run build        # production build → dist/rawaaf
```

The backend address is set in **`proxy.conf.json`** (`target`). The backend's `.env` needs
`FRONTEND_URL=http://<this machine>:4200` (payment redirects) and a `PUBLIC_BASE_URL` the browser can
reach (photo URLs).

Development builds show a floating **Demo** menu and quick buttons on `/login` that sign in with the
backend's seeded demo accounts (password `Demo@1234`); `?as=<owner|operator|supervisor|photographer|admin|guest|guest2>`
on any URL does the same. Production builds have neither (`src/environments/`).
The header **EN / عربي** button switches language and direction.

## Stack

| Concern | Choice |
|---|---|
| Framework | Angular 20.3, standalone components, signals, `OnPush`, control flow (`@if`, `@for`, `@let`) |
| Data | Typed endpoint classes over `HttpClient` (`core/api`), loaded in components with `rxResource` |
| Auth | JWT access + refresh tokens, single-flight refresh in an HTTP interceptor, role guards |
| Styling | The prototype design system, copied verbatim to `src/styles/design-system.css`; small additions in `src/styles.scss`. No UI library. |
| i18n | `@ngx-translate/core` 17 — Arabic (default, RTL) and English (LTR) |
| Icons | `lucide-angular` via `<app-icon name="…" />`, registered in `shared/ui/icon/app-icons.ts` |

## Folder structure

```
src/
  environments/            apiBaseUrl, demo login (development only)
  app/
    core/
      api/                 ApiClient, ApiError, DTOs (dto/), one endpoint class per API area (endpoints/)
      auth/                TokenStore, authInterceptor, roles, demo accounts
      services/            auth, catalog (/catalog cache), lang, format, toast, confirm, portal, clipboard
      guards/              authGuard (guest pages), roleGuard(roles) (staff portals)
      status/              API status code → pill colour, per domain
      i18n/                multi-file translate loader, translated route titles
      utils/               date (KSA calendar dates), download
    shared/
      ui/                  reusable presentational components (see below)
      pipes/               sar, num, appDate, relTime, plural, loc (Arabic/English pairs)
      directives/          authSrc (images that need the bearer token)
    layouts/               dash-shell (operator/admin), mobile-shell (field apps), demo-switcher
    features/
      auth/                /login (staff sign-in)
      guest/               guest website
      operator/            owner / operator portal
      field/               supervisor & photographer apps
      admin/               platform admin console
public/i18n/{ar,en}/*.json translations, one file per area
docs/API_INTEGRATION.md    backend integration guide
```

Every portal is lazy-loaded (`app.routes.ts` → `features/<portal>/<portal>.routes.ts`) and every
page is lazy-loaded with `loadComponent`.

## Conventions

### Components
- Standalone, `ChangeDetectionStrategy.OnPush`, `inject()` for DI, signal `input()` / `output()` / `model()`.
- Routed pages: `*.page.ts`, class `XxxPage`, selector `app-xxx-page`. Reusable pieces: `*.component.ts`, class `XxxComponent`.
- Small templates inline; anything over ~40 lines goes to a sibling `.html`.
- Route params arrive as inputs (`withComponentInputBinding`): `readonly id = input.required<string>();`.
- Derived state with `computed()`; local UI state with `signal()`.
- Reuse design-system classes (`card`, `btn btn-primary`, `pill pill-green`, `grid g3`, `tbl`, `page-h`…) — match the prototype markup, don't restyle. Component `styles` only for layout glue the design system lacks.
- A component host used as a grid/flex item needs `:host { display: block; }`.

### Data
- Components never use `HttpClient`: they call an endpoint class from `@api/endpoints/*` (or a feature service wrapping one).
- Load with `rxResource({ params, stream })`; render loading, translated error (with retry) and empty states.
- Mutations: disable the button while in flight, `toast.success(...)` / `toast.apiError(err)`, then `reload()` the resource.
- Branch on `ApiError.from(err).code`, never on the message. Every code has text in `errors.json`.
- Calendar dates are KSA `YYYY-MM-DD` strings; never put them through `new Date()` for display — use `appDate`.
- Show money from the API (`pricing.total`…); never compute payable totals on the client.

### i18n
- No hard-coded UI text. Templates: `{{ 'area.key' | translate }}`. Code: `toast.show('area.key')`, `confirm.ask({ message: 'area.key' })` (both take keys).
- Each area owns its file and namespace: `guest.json`, `account.json`, `operator.json`, `operations.json`, `field.json`, `admin.json`, `auth.json`. Shared: `common.json` (`app`, `common`, `footer`, `demo`), `domain.json` (`domain.api.<group>.<CODE>` enum labels), `status.json` (`status.<domain>.<CODE>`), `errors.json` (`errors.<CODE>`).
- Always add the key to **both** `ar` and `en`.
- API data comes in Arabic/English pairs: `{{ city | loc }}`, `{{ property | loc:'description' }}` (falls back to Arabic).
- Statuses: `<app-status-pill domain="booking" [code]="b.status" />`.
- Numbers/money/dates: `| sar`, `| num`, `| appDate:'short'`, `| relTime`, `count | plural:'common.nights'` (Arabic plural forms via `Intl.PluralRules`).
- Direction-sensitive icons (arrows/chevrons) take `[mirror]="true"` so they flip in LTR.

### Shared UI (`shared/ui`)
`app-icon`, `app-status-pill`, `app-stars`, `app-empty-state`, `app-stat-tile`, `app-field`,
`app-toggle`, `app-tabs` / `app-tab-links`, `app-kv`, `app-page-header`, `app-modal` (render with `@if`, footer via
`[modal-footer]`), `app-line-chart`, `app-bar-chart`, `app-donut-chart`, `app-logo`, `app-footer`,
`app-lang-switch`. Services: `ToastService`, `ConfirmService` (`await confirm.ask(…)`), `ClipboardService`.

## Routes

| Portal | Roles | Routes |
|---|---|---|
| Sign-in | — | `/login` |
| Guest | public; account pages need sign-in | `/`, `/search`, `/property/:id`, `/book/:id`, `/account/:tab`, `/stay/:id`, `/review/:id`, `/invoice/:id`, `/payments/:paymentId/result`, `/payments/not-found`, `/test-gateway/:cartId` (dev gateway) |
| Owner / Operator | OWNER, OPERATOR, ADMIN (payouts: OWNER, ADMIN) | `/operator`, `/operator/properties`, `/operator/property/:id/:tab`, `/operator/add`, `/operator/calendar`, `/operator/pricing`, `/operator/bookings`, `/operator/booking/:id`, `/operator/locks`, `/operator/ops/:tab`, `/operator/reviews`, `/operator/payouts` |
| Supervisor | SUPERVISOR, OPERATOR, OWNER, ADMIN | `/supervisor`, `/supervisor/task/:id`, `/supervisor/locations`, `/supervisor/reports`, `/supervisor/me` |
| Photographer | PHOTOGRAPHER, ADMIN | `/photographer`, `/photographer/shoot/:id`, `/photographer/me` |
| Platform admin | ADMIN | `/admin`, `/admin/verification`, `/admin/photos`, `/admin/disputes`, `/admin/bookings`, `/admin/finance`, `/admin/users`, `/admin/campaigns`, `/admin/integrations`, `/admin/pricing`, `/admin/settings`, `/admin/audit` |
