import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api-client.service';
import { ApiInstant, Page, PageQuery, Uuid } from '../api.types';
import {
  AccessLog,
  Compliance,
  CreateTaskBody,
  DoorCode,
  GuestKey,
  HostBookingsQuery,
  HostTasksQuery,
  Incident,
  IncidentSeverity,
  IncidentStatus,
  ManagedBooking,
  ManagedReview,
  StayRequest,
  StayRequestStatus,
  Task,
  TaskBoardMeta,
  UpdateTaskBody,
} from '../dto';

/** Host portal: bookings of my properties, guest keys, tasks, incidents, requests, reviews. */
@Injectable({ providedIn: 'root' })
export class HostOperationsApi {
  private readonly api = inject(ApiClient);

  // ---------- bookings ----------

  bookings(query: HostBookingsQuery = {}): Observable<Page<ManagedBooking>> {
    return this.api.page('/host/bookings', { ...query });
  }

  booking(id: Uuid): Observable<ManagedBooking> {
    return this.api.get(`/host/bookings/${id}`);
  }

  /** The guest is refunded in full. */
  cancelBooking(id: Uuid, reason: string): Observable<ManagedBooking> {
    return this.api.post(`/host/bookings/${id}/cancel`, { reason });
  }

  checkIn(id: Uuid): Observable<ManagedBooking> {
    return this.api.post(`/host/bookings/${id}/check-in`);
  }

  checkOut(id: Uuid): Observable<ManagedBooking> {
    return this.api.post(`/host/bookings/${id}/check-out`);
  }

  noShow(id: Uuid): Observable<ManagedBooking> {
    return this.api.post(`/host/bookings/${id}/no-show`);
  }

  compliance(id: Uuid): Observable<Compliance> {
    return this.api.get(`/host/bookings/${id}/compliance`);
  }

  // ---------- guest key ----------

  guestKey(bookingId: Uuid): Observable<GuestKey> {
    return this.api.get(`/host/bookings/${bookingId}/access`);
  }

  changeKeyWindow(bookingId: Uuid, window: { validFrom?: ApiInstant; validTo?: ApiInstant }): Observable<GuestKey> {
    return this.api.patch(`/host/bookings/${bookingId}/access`, window);
  }

  reissueKey(bookingId: Uuid): Observable<GuestKey> {
    return this.api.post(`/host/bookings/${bookingId}/access/reissue`);
  }

  /** Logged. */
  emergencyCode(bookingId: Uuid): Observable<DoorCode> {
    return this.api.post(`/host/bookings/${bookingId}/access/emergency`);
  }

  accessLogs(query: PageQuery & { unitId?: Uuid; bookingId?: Uuid; success?: boolean; from?: ApiInstant; to?: ApiInstant } = {}): Observable<Page<AccessLog>> {
    return this.api.page('/host/access-logs', { ...query });
  }

  // ---------- tasks ----------

  tasks(query: HostTasksQuery = {}): Observable<Page<Task, TaskBoardMeta>> {
    return this.api.page('/host/tasks', { ...query });
  }

  createTask(body: CreateTaskBody): Observable<Task> {
    return this.api.post('/host/tasks', body);
  }

  updateTask(id: Uuid, body: UpdateTaskBody): Observable<Task> {
    return this.api.patch(`/host/tasks/${id}`, body);
  }

  cancelTask(id: Uuid): Observable<Task> {
    return this.api.post(`/host/tasks/${id}/cancel`);
  }

  // ---------- incidents ----------

  incidents(query: PageQuery & { status?: IncidentStatus; severity?: IncidentSeverity; propertyId?: Uuid } = {}): Observable<Page<Incident>> {
    return this.api.page('/host/incidents', { ...query });
  }

  /** A resolution text is required to resolve. */
  updateIncident(id: Uuid, status: 'IN_PROGRESS' | 'RESOLVED', resolution?: string): Observable<Incident> {
    return this.api.patch(`/host/incidents/${id}`, resolution ? { status, resolution } : { status });
  }

  // ---------- early check-in / late check-out ----------

  stayRequests(query: PageQuery & { status?: StayRequestStatus } = {}): Observable<Page<StayRequest>> {
    return this.api.page('/host/stay-requests', { ...query });
  }

  decideStayRequest(id: Uuid, approve: boolean, reason?: string): Observable<StayRequest> {
    return this.api.post(`/host/stay-requests/${id}/decision`, reason ? { approve, reason } : { approve });
  }

  // ---------- reviews ----------

  reviews(query: PageQuery & { propertyId?: Uuid; unanswered?: boolean } = {}): Observable<Page<ManagedReview>> {
    return this.api.page('/host/reviews', { ...query });
  }

  /** PUT again to edit. */
  reply(reviewId: Uuid, text: string): Observable<ManagedReview> {
    return this.api.put(`/host/reviews/${reviewId}/reply`, { text });
  }

  deleteReply(reviewId: Uuid): Observable<unknown> {
    return this.api.delete(`/host/reviews/${reviewId}/reply`);
  }
}
