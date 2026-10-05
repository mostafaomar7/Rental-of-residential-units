import { Injectable, inject } from '@angular/core';
import { DiscoveryApi } from '@api/endpoints/discovery.api';

const UTM_KEY = 'rawaaf_utm_campaign';

/**
 * Ad-campaign attribution: a landing URL with `?utm_campaign=` is counted as a visit and the
 * campaign is remembered for the tab, so a booking made later is attributed to it.
 */
@Injectable({ providedIn: 'root' })
export class CampaignAttributionService {
  private readonly discoveryApi = inject(DiscoveryApi);

  /** Records a visit from a campaign landing URL. */
  landed(utmCampaign: string | null): void {
    if (!utmCampaign || utmCampaign === this.campaign()) return;
    try {
      sessionStorage.setItem(UTM_KEY, utmCampaign);
    } catch {
      // Storage unavailable — the visit is still counted.
    }
    this.discoveryApi.trackCampaign(utmCampaign, 'visit').subscribe({ error: () => undefined });
  }

  /** The campaign this tab arrived from, if any. */
  campaign(): string | undefined {
    try {
      return sessionStorage.getItem(UTM_KEY) ?? undefined;
    } catch {
      return undefined;
    }
  }
}
