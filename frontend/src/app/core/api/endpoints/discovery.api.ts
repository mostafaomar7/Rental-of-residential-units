import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api-client.service';
import { ApiDate, Page, Uuid } from '../api.types';
import {
  AvailabilityDay,
  Catalog,
  CompareResult,
  PropertyCard,
  PropertyDetail,
  PropertyReviews,
  PropertyReviewsQuery,
  PropertySearchQuery,
  Quote,
  QuoteQuery,
} from '../dto';

/** Public browsing: catalog, search, property page, availability, quotes, reviews. */
@Injectable({ providedIn: 'root' })
export class DiscoveryApi {
  private readonly api = inject(ApiClient);

  catalog(): Observable<Catalog> {
    return this.api.get('/catalog');
  }

  search(query: PropertySearchQuery = {}): Observable<Page<PropertyCard>> {
    return this.api.page('/properties', { ...query });
  }

  featured(limit = 10): Observable<PropertyCard[]> {
    return this.api.get('/properties/featured', { limit });
  }

  property(id: Uuid): Observable<PropertyDetail> {
    return this.api.get(`/properties/${id}`);
  }

  compare(ids: Uuid[]): Observable<CompareResult> {
    return this.api.get('/properties/compare', { ids });
  }

  /** Paginated; `data` is `{ summary, items }`, so the page meta is dropped here. */
  reviews(propertyId: Uuid, query: PropertyReviewsQuery = {}): Observable<PropertyReviews> {
    return this.api.get(`/properties/${propertyId}/reviews`, { ...query });
  }

  availability(unitId: Uuid, from: ApiDate, to: ApiDate): Observable<AvailabilityDay[]> {
    return this.api.get(`/units/${unitId}/availability`, { from, to });
  }

  quote(unitId: Uuid, query: QuoteQuery): Observable<Quote> {
    return this.api.get(`/units/${unitId}/quote`, { ...query });
  }

  /** Counts an ad impression / visit; the response is always empty. */
  trackCampaign(utmCampaign: string, event: 'impression' | 'visit'): Observable<unknown> {
    return this.api.post('/campaigns/track', { utmCampaign, event });
  }
}
