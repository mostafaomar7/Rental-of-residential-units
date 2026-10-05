import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api-client.service';
import { Page, PageQuery, Uuid } from '../api.types';
import {
  Access,
  Booking,
  BookingGroup,
  CancellationPreview,
  Compliance,
  CreateBookingBody,
  DoorCode,
  Incident,
  Invoice,
  Payment,
  PaymentMethod,
  PromoPreview,
  PromoPreviewBody,
  ReportIncidentBody,
  Stay,
  StayRequest,
  StayRequestType,
} from '../dto';

/** The guest's own bookings: booking flow, payment, cancellation, stay and digital key. */
@Injectable({ providedIn: 'root' })
export class BookingsApi {
  private readonly api = inject(ApiClient);

  list(group: BookingGroup = 'all', query: PageQuery = {}): Observable<Page<Booking>> {
    return this.api.page('/bookings', { group, ...query });
  }

  get(id: Uuid): Observable<Booking> {
    return this.api.get(`/bookings/${id}`);
  }

  /** Holds the dates (~10 min, see `holdExpiresAt`) until paid. */
  create(body: CreateBookingBody): Observable<Booking> {
    return this.api.post('/bookings', body);
  }

  previewPromo(body: PromoPreviewBody): Observable<PromoPreview> {
    return this.api.post('/promo-codes/preview', body);
  }

  /** WALLET pays immediately; GATEWAY returns a `paymentUrl` to redirect to. */
  pay(id: Uuid, method: PaymentMethod): Observable<Payment> {
    return this.api.post(`/bookings/${id}/payments`, { method });
  }

  payment(paymentId: Uuid): Observable<Payment> {
    return this.api.get(`/payments/${paymentId}`);
  }

  /** Development backends only (`PAYMENT_DRIVER=test`): simulates the gateway result. */
  completeTestPayment(paymentId: Uuid, success: boolean): Observable<Payment> {
    return this.api.post(`/payments/${paymentId}/test-complete`, { success });
  }

  cancellationPreview(id: Uuid): Observable<CancellationPreview> {
    return this.api.get(`/bookings/${id}/cancellation-preview`);
  }

  cancel(id: Uuid, reason?: string): Observable<Booking> {
    return this.api.post(`/bookings/${id}/cancel`, reason ? { reason } : {});
  }

  invoice(id: Uuid): Observable<Invoice> {
    return this.api.get(`/bookings/${id}/invoice`);
  }

  invoicePdf(id: Uuid): Observable<Blob> {
    return this.api.blob(`/bookings/${id}/invoice.pdf`);
  }

  // ---------- the stay ----------

  stay(id: Uuid): Observable<Stay> {
    return this.api.get(`/bookings/${id}/stay`);
  }

  access(id: Uuid): Observable<Access> {
    return this.api.get(`/bookings/${id}/access`);
  }

  /** Rate-limited and logged — call only when the guest taps "show code". */
  revealCode(id: Uuid): Observable<DoorCode> {
    return this.api.post(`/bookings/${id}/access/reveal`);
  }

  unlock(id: Uuid): Observable<{ opened: boolean }> {
    return this.api.post(`/bookings/${id}/access/unlock`);
  }

  compliance(id: Uuid): Observable<Compliance> {
    return this.api.get(`/bookings/${id}/compliance`);
  }

  checkout(id: Uuid): Observable<{ bookingId: Uuid; status: string }> {
    return this.api.post(`/bookings/${id}/checkout`);
  }

  incidents(id: Uuid): Observable<Incident[]> {
    return this.api.get(`/bookings/${id}/incidents`);
  }

  reportIncident(id: Uuid, body: ReportIncidentBody): Observable<Incident> {
    return this.api.post(`/bookings/${id}/incidents`, body);
  }

  stayRequests(id: Uuid): Observable<StayRequest[]> {
    return this.api.get(`/bookings/${id}/stay-requests`);
  }

  /** The fee is taken from the wallet at once and refunded if rejected or cancelled. */
  requestStayChange(id: Uuid, type: StayRequestType, time: string): Observable<StayRequest> {
    return this.api.post(`/bookings/${id}/stay-requests`, { type, time });
  }

  cancelStayRequest(id: Uuid, requestId: Uuid): Observable<StayRequest> {
    return this.api.delete(`/bookings/${id}/stay-requests/${requestId}`);
  }
}
