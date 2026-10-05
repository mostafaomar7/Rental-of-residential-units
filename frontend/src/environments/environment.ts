import { Environment } from './environment.model';

/** Production settings. The API is served from the same origin (reverse proxy) under `/api/v1`. */
export const environment: Environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  demoLogin: null,
};
