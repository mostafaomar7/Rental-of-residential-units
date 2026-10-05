import { Environment } from './environment.model';

/**
 * `ng serve` settings. Requests to `/api` and `/uploads` are forwarded to the backend by
 * `proxy.conf.json` — change the backend address there, not here.
 */
export const environment: Environment = {
  production: false,
  apiBaseUrl: '/api/v1',
  demoLogin: { password: 'Demo@1234' },
};
