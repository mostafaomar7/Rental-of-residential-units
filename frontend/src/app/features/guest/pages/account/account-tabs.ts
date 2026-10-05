export type AccountTab = 'overview' | 'bookings' | 'favorites' | 'wallet' | 'points' | 'reviews' | 'identity' | 'claims' | 'settings';

export interface AccountNavItem {
  id: AccountTab;
  icon: string;
}

/** Account sections in sidebar order; labels are `account.nav.<id>`. */
export const ACCOUNT_NAV: readonly AccountNavItem[] = [
  { id: 'overview', icon: 'layout-grid' },
  { id: 'bookings', icon: 'calendar' },
  { id: 'favorites', icon: 'heart' },
  { id: 'wallet', icon: 'wallet' },
  { id: 'points', icon: 'gift' },
  { id: 'reviews', icon: 'star' },
  { id: 'identity', icon: 'id-card' },
  { id: 'claims', icon: 'shield-alert' },
  { id: 'settings', icon: 'settings' },
];

export function isAccountTab(value: string): value is AccountTab {
  return ACCOUNT_NAV.some((item) => item.id === value);
}
