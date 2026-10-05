import { Role } from '@api/dto';

/** Landing page of each role's portal. */
export const ROLE_HOME: Record<Role, string> = {
  GUEST: '/',
  OWNER: '/operator',
  OPERATOR: '/operator',
  SUPERVISOR: '/supervisor',
  PHOTOGRAPHER: '/photographer',
  ADMIN: '/admin',
};

/** Roles allowed into each staff portal (the API enforces the same rules). */
export const PORTAL_ROLES = {
  operator: ['OWNER', 'OPERATOR', 'ADMIN'],
  supervisor: ['SUPERVISOR', 'OPERATOR', 'OWNER', 'ADMIN'],
  photographer: ['PHOTOGRAPHER', 'ADMIN'],
  admin: ['ADMIN'],
} as const satisfies Record<string, readonly Role[]>;

/** Payout screens are for property owners only. */
export const FINANCE_ROLES: readonly Role[] = ['OWNER', 'ADMIN'];

/**
 * Seeded demo accounts (`npm run seed:demo` on the backend). Only used when the environment
 * enables demo login; the shared password lives in `environment.demoLogin`.
 */
export const DEMO_ACCOUNTS = {
  admin: '0500000001',
  owner: '0500000002',
  operator: '0500000003',
  supervisor: '0500000004',
  photographer: '0500000005',
  /** Staying now (digital key), upcoming booking, past stays, wallet balance. */
  guest: '0500000006',
  /** Upcoming + cancelled booking, a review. */
  guest2: '0500000007',
} as const;

export type DemoAccount = keyof typeof DEMO_ACCOUNTS;
