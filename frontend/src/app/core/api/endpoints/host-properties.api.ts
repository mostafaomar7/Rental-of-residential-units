import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api-client.service';
import { filesForm } from '../form-data';
import { ApiDate, Page, Uuid } from '../api.types';
import {
  Block,
  BlockReason,
  Discount,
  DocumentType,
  HostPropertiesQuery,
  Lock,
  ManagedPhoto,
  ManagedProperty,
  ManagedUnit,
  PairLockBody,
  Person,
  PricingSettings,
  PricingSettingsBody,
  PropertyBody,
  PropertyChecklist,
  PropertyRow,
  PropertyDocument,
  RatesBody,
  UnitBody,
  UnitCalendar,
  DoorCode,
} from '../dto';

/** Host portal: property onboarding and management, units, calendar, rates, locks. */
@Injectable({ providedIn: 'root' })
export class HostPropertiesApi {
  private readonly api = inject(ApiClient);

  // ---------- properties ----------

  list(query: HostPropertiesQuery = {}): Observable<Page<PropertyRow>> {
    return this.api.page('/host/properties', { ...query });
  }

  get(id: Uuid): Observable<ManagedProperty> {
    return this.api.get(`/host/properties/${id}`);
  }

  /** Creates a draft. `typeId` and `nameAr` are required. */
  create(body: PropertyBody & { typeId: Uuid; nameAr: string }): Observable<ManagedProperty> {
    return this.api.post('/host/properties', body);
  }

  update(id: Uuid, body: PropertyBody): Observable<ManagedProperty> {
    return this.api.patch(`/host/properties/${id}`, body);
  }

  remove(id: Uuid): Observable<unknown> {
    return this.api.delete(`/host/properties/${id}`);
  }

  setAmenities(id: Uuid, amenityIds: Uuid[]): Observable<ManagedProperty> {
    return this.api.put(`/host/properties/${id}/amenities`, { amenityIds });
  }

  /** What is still missing before the property can be submitted. */
  checklist(id: Uuid): Observable<PropertyChecklist> {
    return this.api.get(`/host/properties/${id}/checklist`);
  }

  submit(id: Uuid): Observable<ManagedProperty> {
    return this.api.post(`/host/properties/${id}/submit`);
  }

  withdraw(id: Uuid): Observable<ManagedProperty> {
    return this.api.post(`/host/properties/${id}/withdraw`);
  }

  // ---------- photos & documents ----------

  /** Up to 10 images per request (JPEG/PNG/WebP/HEIC, 10 MB each). */
  uploadPhotos(id: Uuid, files: readonly File[], unitId?: Uuid): Observable<ManagedPhoto[]> {
    return this.api.upload(`/host/properties/${id}/photos`, filesForm('photos', files, { unitId }));
  }

  reorderPhotos(id: Uuid, photoIds: Uuid[]): Observable<ManagedPhoto[]> {
    return this.api.put(`/host/properties/${id}/photos/order`, { photoIds });
  }

  updatePhoto(photoId: Uuid, body: { caption?: string | null; isCover?: boolean; unitId?: Uuid | null }): Observable<ManagedPhoto> {
    return this.api.patch(`/host/photos/${photoId}`, body);
  }

  deletePhoto(photoId: Uuid): Observable<unknown> {
    return this.api.delete(`/host/photos/${photoId}`);
  }

  uploadDocument(id: Uuid, file: File, type?: DocumentType): Observable<PropertyDocument> {
    return this.api.upload(`/host/properties/${id}/documents`, filesForm('file', [file], { type }));
  }

  deleteDocument(documentId: Uuid): Observable<unknown> {
    return this.api.delete(`/host/documents/${documentId}`);
  }

  documentFile(documentId: Uuid): Observable<Blob> {
    return this.api.blob(`/host/documents/${documentId}/file`);
  }

  // ---------- people ----------

  /** Owner only — the operator must already have an OPERATOR account. */
  addOperator(id: Uuid, mobile: string): Observable<ManagedProperty> {
    return this.api.post(`/host/properties/${id}/operators`, { mobile });
  }

  removeOperator(id: Uuid, operatorId: Uuid): Observable<unknown> {
    return this.api.delete(`/host/properties/${id}/operators/${operatorId}`);
  }

  supervisors(id: Uuid): Observable<Person[]> {
    return this.api.get(`/host/properties/${id}/supervisors`);
  }

  assignSupervisor(id: Uuid, supervisorId: Uuid): Observable<Person[]> {
    return this.api.put(`/host/properties/${id}/supervisors/${supervisorId}`);
  }

  removeSupervisor(id: Uuid, supervisorId: Uuid): Observable<unknown> {
    return this.api.delete(`/host/properties/${id}/supervisors/${supervisorId}`);
  }

  // ---------- smart-pricing settings ----------

  pricingSettings(id: Uuid): Observable<PricingSettings> {
    return this.api.get(`/host/properties/${id}/pricing`);
  }

  updatePricingSettings(id: Uuid, body: PricingSettingsBody): Observable<PricingSettings> {
    return this.api.put(`/host/properties/${id}/pricing`, body);
  }

  regenerateRecommendations(id: Uuid): Observable<{ created: number; updated: number; applied: number; removed: number }> {
    return this.api.post(`/host/properties/${id}/pricing/regenerate`);
  }

  // ---------- units ----------

  addUnit(id: Uuid, body: UnitBody & { name: string; maxGuests: number; basePrice: number }): Observable<ManagedUnit> {
    return this.api.post(`/host/properties/${id}/units`, body);
  }

  updateUnit(unitId: Uuid, body: UnitBody): Observable<ManagedUnit> {
    return this.api.patch(`/host/units/${unitId}`, body);
  }

  deleteUnit(unitId: Uuid): Observable<unknown> {
    return this.api.delete(`/host/units/${unitId}`);
  }

  calendar(unitId: Uuid, from: ApiDate, to: ApiDate): Observable<UnitCalendar> {
    return this.api.get(`/host/units/${unitId}/calendar`, { from, to });
  }

  setRates(unitId: Uuid, body: RatesBody): Observable<{ updatedDays: number }> {
    return this.api.put(`/host/units/${unitId}/rates`, body);
  }

  clearRates(unitId: Uuid, body: Pick<RatesBody, 'startDate' | 'endDate' | 'weekdays'>): Observable<unknown> {
    return this.api.delete(`/host/units/${unitId}/rates`, body);
  }

  block(unitId: Uuid, body: { startDate: ApiDate; endDate: ApiDate; reason: BlockReason; note?: string | null }): Observable<Block> {
    return this.api.post(`/host/units/${unitId}/blocks`, body);
  }

  unblock(blockId: Uuid): Observable<unknown> {
    return this.api.delete(`/host/blocks/${blockId}`);
  }

  discounts(unitId: Uuid): Observable<Discount[]> {
    return this.api.get(`/host/units/${unitId}/discounts`);
  }

  addDiscount(unitId: Uuid, body: Omit<Discount, 'id'>): Observable<Discount> {
    return this.api.post(`/host/units/${unitId}/discounts`, body);
  }

  removeDiscount(discountId: Uuid): Observable<unknown> {
    return this.api.delete(`/host/discounts/${discountId}`);
  }

  // ---------- locks ----------

  locks(): Observable<Lock[]> {
    return this.api.get('/host/locks');
  }

  unitLock(unitId: Uuid): Observable<Lock | null> {
    return this.api.get(`/host/units/${unitId}/lock`);
  }

  pairLock(unitId: Uuid, body: PairLockBody): Observable<Lock> {
    return this.api.put(`/host/units/${unitId}/lock`, body);
  }

  unpairLock(unitId: Uuid): Observable<{ revokedKeys: number }> {
    return this.api.delete(`/host/units/${unitId}/lock`);
  }

  syncLock(unitId: Uuid): Observable<Lock> {
    return this.api.post(`/host/units/${unitId}/lock/sync`);
  }

  testCode(unitId: Uuid): Observable<DoorCode> {
    return this.api.post(`/host/units/${unitId}/lock/test-code`);
  }
}
