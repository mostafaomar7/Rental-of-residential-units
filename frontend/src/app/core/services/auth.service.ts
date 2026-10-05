import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Observable, catchError, firstValueFrom, map, of, tap } from 'rxjs';
import { environment } from '@env/environment';
import { AuthApi } from '@api/endpoints/auth.api';
import { MeApi } from '@api/endpoints/me.api';
import { AuthSession, OtpRequestResult, RegisterBody, Role, User } from '@api/dto';
import { TokenStore } from '@core/auth/token-store.service';
import { DEMO_ACCOUNTS, DemoAccount, ROLE_HOME } from '@core/auth/roles';

/** Outcome of an OTP check: signed in, or a new number that must finish registration. */
export type OtpOutcome = { kind: 'signed-in'; user: User } | { kind: 'register'; registrationToken: string };

/**
 * The signed-in user and every way to sign in or out (OTP for guests, password for staff,
 * seeded demo accounts in development). Tokens live in {@link TokenStore}; the HTTP
 * interceptor refreshes them.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authApi = inject(AuthApi);
  private readonly meApi = inject(MeApi);
  private readonly tokens = inject(TokenStore);
  private readonly router = inject(Router);

  private readonly current = signal<User | null>(this.tokens.user());

  readonly user = this.current.asReadonly();
  readonly isLoggedIn = computed(() => this.current() !== null);
  readonly role = computed<Role | null>(() => this.current()?.role ?? null);
  /** Demo shortcuts are available (development backends only). */
  readonly demoEnabled = environment.demoLogin !== null;

  /** URL to open after a successful sign-in; non-null while the guest login dialog should be shown. */
  readonly loginRequest = signal<string | null>(null);

  constructor() {
    this.tokens.expired$.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      this.current.set(null);
      this.requestLogin(this.router.url);
    });
  }

  /** Re-validates a restored session at start-up (also picks up role or name changes). */
  restore(): Promise<void> {
    if (!this.tokens.hasSession()) return Promise.resolve();
    return firstValueFrom(
      this.meApi.profile().pipe(
        tap((user) => this.setUser(user)),
        map(() => undefined),
        // Offline or backend down: keep the cached profile; a rejected token already cleared it.
        catchError(() => of(undefined)),
      ),
    );
  }

  // ---------- login dialog ----------

  /** Opens the login dialog; after sign-in the user is sent to `redirectTo` (if given). */
  requestLogin(redirectTo = ''): void {
    this.loginRequest.set(redirectTo);
  }

  /** Returns `true` when signed in; otherwise opens the login dialog and returns `false`. */
  ensureLoggedIn(redirectTo = ''): boolean {
    if (this.isLoggedIn()) return true;
    this.requestLogin(redirectTo);
    return false;
  }

  cancelLogin(): void {
    this.loginRequest.set(null);
  }

  // ---------- sign-in flows ----------

  requestOtp(mobile: string): Observable<OtpRequestResult> {
    return this.authApi.requestOtp(mobile);
  }

  verifyOtp(mobile: string, code: string): Observable<OtpOutcome> {
    return this.authApi.verifyOtp(mobile, code).pipe(
      map((res): OtpOutcome =>
        res.isRegistered
          ? { kind: 'signed-in', user: this.start(res) }
          : { kind: 'register', registrationToken: res.registrationToken },
      ),
    );
  }

  register(body: RegisterBody): Observable<User> {
    return this.authApi.register(body).pipe(map((session) => this.start(session)));
  }

  loginWithPassword(mobile: string, password: string): Observable<User> {
    return this.authApi.login(mobile, password).pipe(map((session) => this.start(session)));
  }

  /** Signs in as a seeded demo account (development only). */
  loginAsDemo(account: DemoAccount): Observable<User> {
    const demo = environment.demoLogin;
    if (!demo) throw new Error('Demo login is disabled in this environment');
    return this.loginWithPassword(DEMO_ACCOUNTS[account], demo.password);
  }

  /** `?as=<demo account>` on a URL signs that account in first — handy for sharing deep links. */
  async applyDemoLogin(asParam: string | null): Promise<void> {
    if (!this.demoEnabled || !asParam || !(asParam in DEMO_ACCOUNTS)) return;
    const account = asParam as DemoAccount;
    if (this.tokens.user()?.mobile === DEMO_ACCOUNTS[account]) return;
    await firstValueFrom(this.loginAsDemo(account)).catch(() => undefined);
  }

  /** Where the dialog/login page should go once signed in. */
  completeLogin(user: User, fallback = ROLE_HOME[user.role]): void {
    const redirect = this.loginRequest();
    this.loginRequest.set(null);
    void this.router.navigateByUrl(redirect || fallback);
  }

  logout(redirectTo = '/'): void {
    const refreshToken = this.tokens.refreshToken;
    if (refreshToken) this.authApi.logout(refreshToken).subscribe({ error: () => undefined });
    this.tokens.clear();
    this.current.set(null);
    void this.router.navigateByUrl(redirectTo);
  }

  /** Keeps the cached profile in sync after profile edits. */
  setUser(user: User): void {
    this.tokens.setUser(user);
    this.current.set(user);
  }

  homeFor(role: Role): string {
    return ROLE_HOME[role];
  }

  private start(session: AuthSession): User {
    this.tokens.start(session.tokens, session.user);
    this.current.set(session.user);
    return session.user;
  }
}
