import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api-client.service';
import { filesForm } from '../form-data';
import { Page, PageQuery, Uuid } from '../api.types';
import {
  AppNotification,
  DamageCase,
  Identity,
  Loyalty,
  ManagedReview,
  ManualIdentityBody,
  NafathRequest,
  NotificationPreferences,
  NotificationsMeta,
  OtpRequestResult,
  PendingReview,
  Payment,
  PointsTransaction,
  PointsTransactionType,
  PropertyCard,
  RedeemResult,
  UpdateProfileBody,
  User,
  Wallet,
  WalletTransaction,
  WalletTransactionType,
} from '../dto';

/** Everything under `/users/me`, plus the signed-in user's reviews and damage claims. */
@Injectable({ providedIn: 'root' })
export class MeApi {
  private readonly api = inject(ApiClient);

  // ---------- profile ----------

  profile(): Observable<User> {
    return this.api.get('/users/me');
  }

  updateProfile(body: UpdateProfileBody): Observable<User> {
    return this.api.patch('/users/me', body);
  }

  /** PDPL account deletion. */
  deleteAccount(): Observable<unknown> {
    return this.api.delete('/users/me', { confirm: 'DELETE' });
  }

  setPassword(newPassword: string, currentPassword?: string): Observable<unknown> {
    return this.api.post('/users/me/password', currentPassword ? { currentPassword, newPassword } : { newPassword });
  }

  requestMobileChange(newMobile: string): Observable<OtpRequestResult> {
    return this.api.post('/users/me/mobile/request', { newMobile });
  }

  confirmMobileChange(newMobile: string, code: string): Observable<User> {
    return this.api.post('/users/me/mobile/confirm', { newMobile, code });
  }

  notificationPreferences(): Observable<NotificationPreferences> {
    return this.api.get('/users/me/notification-preferences');
  }

  updateNotificationPreferences(body: Partial<Pick<NotificationPreferences, 'sms' | 'whatsapp' | 'email'>>): Observable<NotificationPreferences> {
    return this.api.put('/users/me/notification-preferences', body);
  }

  // ---------- notifications ----------

  notifications(query: PageQuery & { unread?: boolean } = {}): Observable<Page<AppNotification, NotificationsMeta>> {
    return this.api.page('/users/me/notifications', { ...query });
  }

  unreadCount(): Observable<{ count: number }> {
    return this.api.get('/users/me/notifications/unread-count');
  }

  markRead(id: Uuid): Observable<unknown> {
    return this.api.post(`/users/me/notifications/${id}/read`);
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.api.post('/users/me/notifications/read-all');
  }

  // ---------- favourites ----------

  favorites(query: PageQuery = {}): Observable<Page<PropertyCard>> {
    return this.api.page('/users/me/favorites', { ...query });
  }

  addFavorite(propertyId: Uuid): Observable<{ propertyId: Uuid; isFavorite: boolean }> {
    return this.api.put(`/users/me/favorites/${propertyId}`);
  }

  removeFavorite(propertyId: Uuid): Observable<{ propertyId: Uuid; isFavorite: boolean }> {
    return this.api.delete(`/users/me/favorites/${propertyId}`);
  }

  // ---------- wallet ----------

  wallet(): Observable<Wallet> {
    return this.api.get('/users/me/wallet');
  }

  walletTransactions(query: PageQuery & { type?: WalletTransactionType } = {}): Observable<Page<WalletTransaction>> {
    return this.api.page('/users/me/wallet/transactions', { ...query });
  }

  /** Returns a gateway payment — redirect to its `paymentUrl`. */
  topUp(amount: number): Observable<Payment> {
    return this.api.post('/users/me/wallet/topups', { amount });
  }

  // ---------- loyalty ----------

  loyalty(): Observable<Loyalty> {
    return this.api.get('/users/me/loyalty');
  }

  points(query: PageQuery & { type?: PointsTransactionType } = {}): Observable<Page<PointsTransaction>> {
    return this.api.page('/users/me/loyalty/points', { ...query });
  }

  redeemPoints(points: number): Observable<RedeemResult> {
    return this.api.post('/users/me/loyalty/redeem', { points });
  }

  // ---------- identity ----------

  identity(): Observable<Identity | null> {
    return this.api.get('/users/me/identity');
  }

  saveManualIdentity(body: ManualIdentityBody): Observable<Identity> {
    return this.api.put('/users/me/identity', body);
  }

  startNafath(idNumber: string): Observable<NafathRequest> {
    return this.api.post('/users/me/nafath', { idNumber });
  }

  nafathStatus(id: Uuid): Observable<NafathRequest> {
    return this.api.get(`/users/me/nafath/${id}`);
  }

  // ---------- reviews ----------

  myReviews(query: PageQuery = {}): Observable<Page<ManagedReview>> {
    return this.api.page('/reviews/mine', { ...query });
  }

  pendingReviews(): Observable<PendingReview[]> {
    return this.api.get('/reviews/pending');
  }

  createReview(bookingId: Uuid, rating: number, comment?: string | null): Observable<ManagedReview> {
    return this.api.post('/reviews', { bookingId, rating, comment: comment || null });
  }

  updateReview(id: Uuid, body: { rating?: number; comment?: string | null }): Observable<ManagedReview> {
    return this.api.patch(`/reviews/${id}`, body);
  }

  deleteReview(id: Uuid): Observable<unknown> {
    return this.api.delete(`/reviews/${id}`);
  }

  addReviewPhotos(id: Uuid, files: readonly File[]): Observable<ManagedReview> {
    return this.api.upload(`/reviews/${id}/photos`, filesForm('photos', files));
  }

  removeReviewPhoto(id: Uuid, photoId: Uuid): Observable<unknown> {
    return this.api.delete(`/reviews/${id}/photos/${photoId}`);
  }

  // ---------- damage claims against my bookings ----------

  damageCases(): Observable<DamageCase[]> {
    return this.api.get('/damage-cases');
  }

  damageCase(id: Uuid): Observable<DamageCase> {
    return this.api.get(`/damage-cases/${id}`);
  }

  acceptDamageCase(id: Uuid): Observable<DamageCase> {
    return this.api.post(`/damage-cases/${id}/accept`);
  }

  objectDamageCase(id: Uuid, text: string): Observable<DamageCase> {
    return this.api.post(`/damage-cases/${id}/object`, { text });
  }
}

