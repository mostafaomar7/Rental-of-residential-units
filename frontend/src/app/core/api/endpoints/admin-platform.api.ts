import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api-client.service';
import { Page, PageQuery, Uuid } from '../api.types';
import {
  AdminPropertiesQuery,
  PropertyRow,
  AdminUser,
  AdminUsersQuery,
  AuditLog,
  AuditLogsQuery,
  BookingFinancials,
  DamageCase,
  HostBookingsQuery,
  InviteUserBody,
  ManagedBooking,
  ManagedProperty,
  ManagedReview,
  Role,
  Task,
} from '../dto';

/** Admin console: users, property review, bookings, moderation, damage disputes, audit. */
@Injectable({ providedIn: 'root' })
export class AdminPlatformApi {
  private readonly api = inject(ApiClient);

  // ---------- users ----------

  users(query: AdminUsersQuery = {}): Observable<Page<AdminUser>> {
    return this.api.page('/admin/users', { ...query });
  }

  user(id: Uuid): Observable<AdminUser> {
    return this.api.get(`/admin/users/${id}`);
  }

  inviteUser(body: InviteUserBody): Observable<AdminUser> {
    return this.api.post('/admin/users', body);
  }

  changeRole(id: Uuid, role: Role): Observable<AdminUser> {
    return this.api.patch(`/admin/users/${id}/role`, { role });
  }

  suspendUser(id: Uuid, reason?: string): Observable<AdminUser> {
    return this.api.post(`/admin/users/${id}/suspend`, reason ? { reason } : {});
  }

  reactivateUser(id: Uuid, reason?: string): Observable<AdminUser> {
    return this.api.post(`/admin/users/${id}/reactivate`, reason ? { reason } : {});
  }

  // ---------- property review ----------

  properties(query: AdminPropertiesQuery = {}): Observable<Page<PropertyRow>> {
    return this.api.page('/admin/properties', { ...query });
  }

  /** Includes documents and the completeness checklist. */
  property(id: Uuid): Observable<ManagedProperty> {
    return this.api.get(`/admin/properties/${id}`);
  }

  approveProperty(id: Uuid): Observable<ManagedProperty> {
    return this.api.post(`/admin/properties/${id}/approve`);
  }

  rejectProperty(id: Uuid, reason: string): Observable<ManagedProperty> {
    return this.api.post(`/admin/properties/${id}/reject`, { reason });
  }

  suspendProperty(id: Uuid, reason: string): Observable<ManagedProperty> {
    return this.api.post(`/admin/properties/${id}/suspend`, { reason });
  }

  reactivateProperty(id: Uuid): Observable<ManagedProperty> {
    return this.api.post(`/admin/properties/${id}/reactivate`);
  }

  documentFile(documentId: Uuid): Observable<Blob> {
    return this.api.blob(`/admin/documents/${documentId}/file`);
  }

  /** Photo-shoot QA: decide on every submitted photo (a reason is required to reject). */
  reviewShoot(taskId: Uuid, decisions: { photoId: Uuid; approve: boolean; reason?: string }[], note?: string): Observable<Task> {
    return this.api.post(`/admin/tasks/${taskId}/review`, note ? { decisions, note } : { decisions });
  }

  // ---------- bookings ----------

  bookings(query: HostBookingsQuery = {}): Observable<Page<ManagedBooking>> {
    return this.api.page('/admin/bookings', { ...query });
  }

  booking(id: Uuid): Observable<ManagedBooking> {
    return this.api.get(`/admin/bookings/${id}`);
  }

  cancelBooking(id: Uuid, reason: string, refundPercent = 100): Observable<ManagedBooking> {
    return this.api.post(`/admin/bookings/${id}/cancel`, { reason, refundPercent });
  }

  bookingFinancials(id: Uuid): Observable<BookingFinancials> {
    return this.api.get(`/admin/bookings/${id}/financials`);
  }

  invoicePdf(id: Uuid): Observable<Blob> {
    return this.api.blob(`/admin/bookings/${id}/invoice.pdf`);
  }

  // ---------- reviews moderation ----------

  reviews(query: PageQuery & { status?: 'PUBLISHED' | 'HIDDEN'; propertyId?: Uuid; rating?: number } = {}): Observable<Page<ManagedReview>> {
    return this.api.page('/admin/reviews', { ...query });
  }

  hideReview(id: Uuid, reason: string): Observable<ManagedReview> {
    return this.api.post(`/admin/reviews/${id}/hide`, { reason });
  }

  unhideReview(id: Uuid): Observable<ManagedReview> {
    return this.api.post(`/admin/reviews/${id}/unhide`);
  }

  // ---------- damage disputes ----------

  damageCases(query: PageQuery & { status?: string } = {}): Observable<Page<DamageCase>> {
    return this.api.page('/admin/damage-cases', { ...query });
  }

  startDamageReview(id: Uuid): Observable<DamageCase> {
    return this.api.post(`/admin/damage-cases/${id}/review`);
  }

  approveDamage(id: Uuid, amount: number, note: string): Observable<DamageCase> {
    return this.api.post(`/admin/damage-cases/${id}/approve`, { amount, note });
  }

  rejectDamage(id: Uuid, note: string): Observable<DamageCase> {
    return this.api.post(`/admin/damage-cases/${id}/reject`, { note });
  }

  /** Final decision on a disputed case. */
  decideDamage(id: Uuid, amount: number, note: string): Observable<DamageCase> {
    return this.api.post(`/admin/damage-cases/${id}/decide`, { amount, note });
  }

  settleDamage(id: Uuid, method: 'WALLET' | 'EXTERNAL', reference?: string): Observable<DamageCase> {
    return this.api.post(`/admin/damage-cases/${id}/settle`, reference ? { method, reference } : { method });
  }

  closeDamage(id: Uuid, note: string): Observable<DamageCase> {
    return this.api.post(`/admin/damage-cases/${id}/close`, { note });
  }

  // ---------- audit ----------

  auditLogs(query: AuditLogsQuery = {}): Observable<Page<AuditLog>> {
    return this.api.page('/admin/audit-logs', { ...query });
  }
}
