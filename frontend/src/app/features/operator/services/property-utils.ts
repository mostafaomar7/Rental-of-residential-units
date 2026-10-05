import { Observable, concatMap, from, map, toArray } from 'rxjs';
import { Uuid } from '@api/api.types';
import { ManagedPhoto, ManagedProperty } from '@api/dto';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';

/** The API accepts at most this many photos per upload request. */
const PHOTO_UPLOAD_BATCH = 10;

/** The photo marked as cover, else the first one. */
export function coverPhoto(p: ManagedProperty): ManagedPhoto | undefined {
  const photos = p.content.photos;
  return photos.find((ph) => ph.isCover) ?? sortedPhotos(photos)[0];
}

/** Photos in display order. */
export function sortedPhotos(photos: readonly ManagedPhoto[]): ManagedPhoto[] {
  return [...photos].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Drafts and rejected properties can be (re)submitted; a pending one can be withdrawn. */
export function canSubmit(p: ManagedProperty): boolean {
  return p.status === 'DRAFT' || p.status === 'REJECTED';
}

export function canWithdraw(p: ManagedProperty): boolean {
  return p.status === 'PENDING_REVIEW';
}

/** Uploads any number of photos, {@link PHOTO_UPLOAD_BATCH} per request, one request after another. */
export function uploadPhotos(api: HostPropertiesApi, propertyId: Uuid, files: readonly File[]): Observable<ManagedPhoto[]> {
  const batches = Array.from({ length: Math.ceil(files.length / PHOTO_UPLOAD_BATCH) }, (_, i) =>
    files.slice(i * PHOTO_UPLOAD_BATCH, (i + 1) * PHOTO_UPLOAD_BATCH),
  );
  return from(batches).pipe(
    concatMap((batch) => api.uploadPhotos(propertyId, batch)),
    toArray(),
    map((uploaded) => uploaded.flat()),
  );
}
