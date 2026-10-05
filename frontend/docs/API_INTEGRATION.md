# Backend integration

How the Angular app talks to the Rawaaf API. The backend contract is its Swagger
(`http://<backend>/api/docs`); this file covers the frontend side.

## Running against a backend

`ng serve` proxies `/api` and `/uploads` to the backend (no CORS setup needed). The address lives in
**`proxy.conf.json`** — change `target` in both entries to point at another machine.

The backend must also know where the frontend runs, for payment redirects:
`FRONTEND_URL=http://<this-machine-ip>:4200` in its `.env`, and `PUBLIC_BASE_URL` must be an address
the browser can reach (photo URLs are built from it).

Demo accounts (`npm run seed:demo` on the backend) — password `Demo@1234`, or OTP:

| Role | Mobile |
|---|---|
| ADMIN | 0500000001 |
| OWNER | 0500000002 |
| OPERATOR | 0500000003 |
| SUPERVISOR | 0500000004 |
| PHOTOGRAPHER | 0500000005 |
| GUEST (staying now, wallet) | 0500000006 |
| GUEST (upcoming + cancelled) | 0500000007 |

In development builds the floating **Demo** menu and `/login` sign in with these accounts directly;
`?as=<owner|operator|supervisor|photographer|admin|guest|guest2>` on any URL does the same.
Promo codes: `DEMO10`, `WELCOME50`.

## Layers

```
core/api/
  api.types.ts          envelope, Page<T>, ApiDate/ApiInstant/Uuid, Bilingual
  api-error.ts          ApiError { status, code, details, fieldErrors }
  api-client.service.ts get/page/post/put/patch/delete/upload/blob — unwraps { success, data, meta }
  dto/                  typed request/response shapes, one file per area
  endpoints/            one stateless class per endpoint group (AuthApi, DiscoveryApi, BookingsApi,
                        MeApi, HostPropertiesApi, HostOperationsApi, HostInsightsApi, FieldApi,
                        AdminPlatformApi, AdminBusinessApi, AdminConfigApi)
core/auth/              TokenStore, authInterceptor (bearer + single-flight refresh), roles & demo accounts
core/services/auth.service.ts      signed-in user, OTP / password / demo sign-in, logout
core/services/catalog.service.ts   /catalog loaded once: cities, types, amenities, public settings
```

Components never call `HttpClient` directly: they use an endpoint class (or a feature service that
wraps one).

## Conventions

**Loading data** — `rxResource` keyed on signals:

```ts
private readonly bookingsApi = inject(BookingsApi);
readonly group = signal<BookingGroup>('upcoming');
protected readonly bookings = rxResource({
  params: () => ({ group: this.group() }),
  stream: ({ params }) => this.bookingsApi.list(params.group),
});
```

Templates handle `isLoading()`, `error()` and empty states; read `value()` only when `hasValue()`.
After a mutation, call `.reload()` (or `.update()` with the returned entity).

**Mutations** — subscribe, disable the button while in flight (`busy` signal), toast on success,
`toast.apiError(err)` on failure. For conflicts with special handling, branch on the code:
`ApiError.from(err).is('PRICE_CHANGED')` → read `err.details`.

**Errors** — never show `error.message`. `errors.<CODE>` in `public/i18n/<lang>/errors.json` has every
backend code; `errorKey(err, translate)` / `toast.apiError(err)` fall back to a generic message.
Form validation: `ApiError.from(err).fieldErrors` → `[{ field, message }]`.

**Bilingual data** — API objects carry `nameAr`/`nameEn` (and `descriptionAr`/`…En`, …). Use the
`loc` pipe: `{{ city | loc }}`, `{{ property | loc:'description' }}`. English may be null → Arabic.

**Statuses** — `<app-status-pill domain="booking" [code]="b.status" />` with the API's UPPER_CASE
codes. Domains: booking, payment, refund, key, property, task, incident, severity, damage,
stayRequest, user, campaign, statement, bankAccount, recommendation, integrationCall,
integrationHealth, delivery, review, lock, nafath. Other enums: `domain.api.<group>.<CODE>`
(role, operatingModel, taskType, incidentCategory, documentType, blockReason, stayRequestType,
paymentMethod, walletTx, pointsTx, earningType, lockProvider, pricingEventType, cancelledBy, identityType).

**Dates** — calendar dates are `YYYY-MM-DD` strings in Saudi time; keep them as strings and format
with `appDate`. Instants (`createdAt`, `holdExpiresAt`…) are ISO UTC; `appDate:'dateTime'` / `relTime`.
Range ends differ by endpoint: availability / calendar `to` and block `endDate` are **exclusive**
(like a check-out date); rate and discount `endDate` are **inclusive**. The calendar's picked days are
inclusive ranges (`consecutiveRanges`), so the block dialog sends `endDate + 1`.

**Enums** — the full list (59) is in the backend's `openapi.json` → `components.schemas`
(`/api/docs/openapi.json`). A new value needs its label in `status.json` / `domain.json`.

**Validation** — `VALIDATION_ERROR` details carry `field`, `type` and `limit`
(`{ "field": "reason", "type": "string.min", "limit": 5 }`); `toast.apiError` turns `string.min`
into "enter at least N characters".

**Money** — SAR with up to 2 decimals; `sar` pipe. Never compute a payable total on the client: show
the API's `pricing.total`.

**Images** — public photo URLs (`/uploads/…`) go in `src`. Private files (operations photos
`/api/v1/ops-photos/…`, documents) need the token: `<img [authSrc]="photo.thumbUrl">`; downloads
(PDF/CSV) via `api.blob(...)` + `saveBlob()`.

**Uploads** — `FormData` with field `photos` (≤10 images) or `file` (document); the endpoint
classes build it (`filesForm`).

**Pagination** — list endpoints return `Page<T>` (`items`, `meta.page/limit/total/totalPages`, plus
extras like `meta.board` or `meta.pendingNet`).

**Access** — guest pages use `authGuard`; staff portals use `roleGuard(PORTAL_ROLES.<portal>)`.
The API also scopes data (404 = not found *or not yours*).

## Key flows

**Booking** — quote (`DiscoveryApi.quote`) → optional `BookingsApi.previewPromo` → show policies and
require acceptance → `BookingsApi.create({ …, acceptPolicies: true, policyVersion, expectedTotal })`.
`PRICE_CHANGED` (details = new pricing) and `POLICY_CHANGED` (details.policy/policyVersion) ask the
guest to confirm again; `DATES_UNAVAILABLE` sends them back to dates. The booking is
`PENDING_PAYMENT` until `holdExpiresAt` (show a countdown).

**Payment** — `BookingsApi.pay(id, 'WALLET' | 'GATEWAY')`. WALLET is paid at once. GATEWAY returns
`paymentUrl`: remember the payment id, redirect the browser. The backend returns the browser to
`/payments/:paymentId/result` (poll `payment(id)` every 2 s, ≤ 1 min, until PAID/FAILED/CANCELLED)
or `/payments/not-found`. Development backends use a fake gateway at `/test-gateway/:cartId`,
which calls `completeTestPayment(paymentId, success)`. Wallet top-ups use the same flow.

**Stay & key** — `stay(id)` has everything for the active-stay screen. Reveal the PIN only on tap
(`revealCode`, rate-limited). Key status `IDENTITY_REQUIRED` → identity verification (Nafath:
`startNafath` → show `random` → poll `nafathStatus` every 3 s; visitors: `saveManualIdentity`).

**Polling** — no sockets: payment result 2 s, Nafath 3 s, unread notifications 30–60 s.
