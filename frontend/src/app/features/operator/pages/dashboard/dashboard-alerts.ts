import { Lock } from '@api/dto';

export interface DashAlert {
  tone: 'red' | 'amber' | 'gold';
  icon: string;
  /** Translation key + params. */
  title: string;
  titleParams?: Record<string, unknown>;
  sub: string;
  subParams?: Record<string, unknown>;
  link: string;
  /** Translation key of the action button. */
  action: string;
}

/** Items needing the host's attention, most urgent first: offline / low-battery locks, incidents, prices. */
export function buildAlerts(lockAlerts: readonly Lock[], openIncidents: number, pendingPrices: number): DashAlert[] {
  const alerts: DashAlert[] = lockAlerts.map((lock) => {
    const offline = lock.status !== 'ONLINE';
    return {
      tone: offline ? 'red' : 'amber',
      icon: offline ? 'wifi-off' : 'battery-low',
      title: offline ? 'operator.dashboard.alerts.lockOffline' : 'operator.dashboard.alerts.lockAttention',
      titleParams: { unit: `${lock.property.nameAr} — ${lock.unit.name}` },
      sub: 'operator.dashboard.alerts.battery',
      subParams: { battery: lock.batteryLevel ?? '—' },
      link: '/operator/locks',
      action: 'operator.dashboard.alerts.handle',
    };
  });
  if (openIncidents) {
    alerts.push({
      tone: 'red',
      icon: 'siren',
      title: 'operator.dashboard.alerts.incidents',
      titleParams: { count: openIncidents },
      sub: 'operator.dashboard.alerts.incidentsSub',
      link: '/operator/ops/incidents',
      action: 'operator.dashboard.alerts.follow',
    });
  }
  if (pendingPrices) {
    alerts.push({
      tone: 'gold',
      icon: 'sparkles',
      title: 'operator.dashboard.alerts.pricing',
      titleParams: { count: pendingPrices },
      sub: 'operator.dashboard.alerts.pricingSub',
      link: '/operator/pricing',
      action: 'operator.dashboard.alerts.review',
    });
  }
  return alerts;
}
