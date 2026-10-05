import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api-client.service';
import { Page, PageQuery, Uuid } from '../api.types';
import {
  AdminCancellationPolicy,
  AdminCatalogItem,
  AdminCity,
  AdminDistrict,
  CatalogListQuery,
  IntegrationCall,
  IntegrationCallsQuery,
  IntegrationHealth,
  NotificationDelivery,
  NotificationTemplate,
  PlatformSetting,
  PricingEvent,
  PricingEventBody,
} from '../dto';

/** Catalog lists editable by the admin; all share the same CRUD shape. */
export type CatalogResource = 'amenities' | 'property-types' | 'cancellation-policies';

/** Admin console: platform settings, catalog, notifications, integrations, pricing events. */
@Injectable({ providedIn: 'root' })
export class AdminConfigApi {
  private readonly api = inject(ApiClient);

  // ---------- settings ----------

  settings(): Observable<PlatformSetting[]> {
    return this.api.get('/admin/settings');
  }

  updateSetting<T>(key: string, value: T): Observable<{ key: string; value: T }> {
    return this.api.put(`/admin/settings/${key}`, { value });
  }

  resetSetting<T>(key: string): Observable<{ key: string; value: T }> {
    return this.api.delete(`/admin/settings/${key}`);
  }

  // ---------- catalog ----------

  cities(query: CatalogListQuery = {}): Observable<AdminCity[]> {
    return this.api.get('/admin/cities', { ...query });
  }

  createCity(body: { slug: string; nameAr: string; nameEn: string; isActive?: boolean; sortOrder?: number }): Observable<AdminCity> {
    return this.api.post('/admin/cities', body);
  }

  updateCity(id: Uuid, body: Partial<Omit<AdminCity, 'id'>>): Observable<AdminCity> {
    return this.api.patch(`/admin/cities/${id}`, body);
  }

  deleteCity(id: Uuid): Observable<unknown> {
    return this.api.delete(`/admin/cities/${id}`);
  }

  districts(cityId: Uuid, query: CatalogListQuery = {}): Observable<AdminDistrict[]> {
    return this.api.get(`/admin/cities/${cityId}/districts`, { ...query });
  }

  addDistrict(cityId: Uuid, body: { nameAr: string; nameEn: string; isActive?: boolean }): Observable<AdminDistrict> {
    return this.api.post(`/admin/cities/${cityId}/districts`, body);
  }

  updateDistrict(id: Uuid, body: { nameAr?: string; nameEn?: string; isActive?: boolean }): Observable<AdminDistrict> {
    return this.api.patch(`/admin/districts/${id}`, body);
  }

  deleteDistrict(id: Uuid): Observable<unknown> {
    return this.api.delete(`/admin/districts/${id}`);
  }

  catalogItems<T extends AdminCatalogItem = AdminCatalogItem>(resource: CatalogResource, query: CatalogListQuery = {}): Observable<T[]> {
    return this.api.get(`/admin/${resource}`, { ...query });
  }

  createCatalogItem<T extends AdminCatalogItem>(resource: CatalogResource, body: Partial<Omit<T, 'id'>>): Observable<T> {
    return this.api.post(`/admin/${resource}`, body);
  }

  updateCatalogItem<T extends AdminCatalogItem>(resource: CatalogResource, id: Uuid, body: Partial<Omit<T, 'id'>>): Observable<T> {
    return this.api.patch(`/admin/${resource}/${id}`, body);
  }

  /** Refused with `IN_USE` while referenced — deactivate instead. */
  deleteCatalogItem(resource: CatalogResource, id: Uuid): Observable<unknown> {
    return this.api.delete(`/admin/${resource}/${id}`);
  }

  cancellationPolicies(query: CatalogListQuery = {}): Observable<AdminCancellationPolicy[]> {
    return this.catalogItems<AdminCancellationPolicy>('cancellation-policies', query);
  }

  // ---------- notifications ----------

  notificationTemplates(): Observable<NotificationTemplate[]> {
    return this.api.get('/admin/notification-templates');
  }

  updateNotificationTemplate(key: string, body: { titleAr: string; titleEn: string; bodyAr: string; bodyEn: string }): Observable<NotificationTemplate> {
    return this.api.put(`/admin/notification-templates/${key}`, body);
  }

  resetNotificationTemplate(key: string): Observable<NotificationTemplate> {
    return this.api.delete(`/admin/notification-templates/${key}`);
  }

  deliveries(query: PageQuery & { status?: NotificationDelivery['status']; channel?: NotificationDelivery['channel'] } = {}): Observable<Page<NotificationDelivery>> {
    return this.api.page('/admin/notification-deliveries', { ...query });
  }

  retryDelivery(id: Uuid): Observable<{ id: Uuid; status: string }> {
    return this.api.post(`/admin/notification-deliveries/${id}/retry`);
  }

  // ---------- integrations ----------

  integrations(): Observable<IntegrationHealth[]> {
    return this.api.get('/admin/integrations');
  }

  integrationCalls(query: IntegrationCallsQuery = {}): Observable<Page<IntegrationCall>> {
    return this.api.page('/admin/integrations/calls', { ...query });
  }

  integrationCall(id: Uuid): Observable<IntegrationCall> {
    return this.api.get(`/admin/integrations/calls/${id}`);
  }

  retryIntegrationCall(id: Uuid): Observable<IntegrationCall> {
    return this.api.post(`/admin/integrations/calls/${id}/retry`);
  }

  // ---------- pricing events ----------

  pricingEvents(query: PageQuery & { from?: string; to?: string } = {}): Observable<Page<PricingEvent>> {
    return this.api.page('/admin/pricing-events', { ...query });
  }

  createPricingEvent(body: PricingEventBody): Observable<PricingEvent> {
    return this.api.post('/admin/pricing-events', body);
  }

  updatePricingEvent(id: Uuid, body: PricingEventBody): Observable<PricingEvent> {
    return this.api.patch(`/admin/pricing-events/${id}`, body);
  }

  deletePricingEvent(id: Uuid): Observable<unknown> {
    return this.api.delete(`/admin/pricing-events/${id}`);
  }
}
