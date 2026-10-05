export interface Environment {
  production: boolean;
  /** API root; same origin (dev proxy / reverse proxy in production). */
  apiBaseUrl: string;
  /** Demo-account shortcuts (portal switcher, `?as=` deep links). Never enabled in production. */
  demoLogin: DemoLoginConfig | null;
}

export interface DemoLoginConfig {
  /** Password shared by every seeded demo account (`npm run seed:demo` on the backend). */
  password: string;
}
