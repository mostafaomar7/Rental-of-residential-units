import { MobileTab } from '@layouts/mobile-shell/mobile-shell.component';

export const SUPERVISOR_TABS: readonly MobileTab[] = [
  { label: 'field.supervisor.tabs.tasks', icon: 'clipboard-check', link: '/supervisor', exact: true },
  { label: 'field.supervisor.tabs.locations', icon: 'map', link: '/supervisor/locations' },
  { label: 'field.supervisor.tabs.reports', icon: 'siren', link: '/supervisor/reports' },
  { label: 'field.supervisor.tabs.me', icon: 'user', link: '/supervisor/me' },
];

export const PHOTOGRAPHER_TABS: readonly MobileTab[] = [
  { label: 'field.photographer.tabs.shoots', icon: 'camera', link: '/photographer', exact: true },
  { label: 'field.photographer.tabs.me', icon: 'user', link: '/photographer/me' },
];

/** The API accepts at most this many photos per upload request. */
export const MAX_PHOTOS_PER_UPLOAD = 10;
