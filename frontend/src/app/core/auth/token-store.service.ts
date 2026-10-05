import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthTokens, User } from '@api/dto';

const STORAGE_KEY = 'rawaaf_session';

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  /** Last known profile, so the UI renders signed-in immediately on reload. */
  user: User | null;
}

/**
 * Persists the token pair (rotated on every refresh) and the cached profile.
 * Kept free of other services so the HTTP interceptor can use it without DI cycles.
 */
@Injectable({ providedIn: 'root' })
export class TokenStore {
  private readonly session = signal<StoredSession | null>(this.restore());

  readonly user = () => this.session()?.user ?? null;
  readonly hasSession = () => this.session() !== null;

  /** Fires when the refresh token is rejected — the user must sign in again. */
  readonly expired$ = new Subject<void>();

  get accessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  get refreshToken(): string | null {
    return this.session()?.refreshToken ?? null;
  }

  start(tokens: AuthTokens, user: User): void {
    this.write({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user });
  }

  /** Stores a rotated pair — the old refresh token is dead from now on. */
  rotate(tokens: AuthTokens): void {
    const current = this.session();
    this.write({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: current?.user ?? null });
  }

  setUser(user: User): void {
    const current = this.session();
    if (current) this.write({ ...current, user });
  }

  clear(): void {
    this.session.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable — nothing persisted anyway.
    }
  }

  private write(session: StoredSession): void {
    this.session.set(session);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Private mode / quota — the session lasts for this tab only.
    }
  }

  private restore(): StoredSession | null {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as StoredSession | null;
      return saved?.accessToken && saved.refreshToken ? saved : null;
    } catch {
      return null;
    }
  }
}
