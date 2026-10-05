import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api-client.service';
import { filesForm } from '../form-data';
import { ApiDate, Page, PageQuery, Uuid } from '../api.types';
import { ChecklistUpdate, DamageCase, Incident, IncidentCategory, IncidentSeverity, OpenDamageCaseBody, Task } from '../dto';

/** Field app (supervisors, photographers): tasks, incidents, damage cases. */
@Injectable({ providedIn: 'root' })
export class FieldApi {
  private readonly api = inject(ApiClient);

  // ---------- tasks ----------

  /** My tasks for a day plus unassigned tasks of my properties. */
  tasks(date?: ApiDate): Observable<Task[]> {
    return this.api.get('/field/tasks', { date });
  }

  task(id: Uuid): Observable<Task> {
    return this.api.get(`/field/tasks/${id}`);
  }

  /** Claims the task if unassigned. */
  start(id: Uuid): Observable<Task> {
    return this.api.post(`/field/tasks/${id}/start`);
  }

  updateChecklist(id: Uuid, items: ChecklistUpdate[]): Observable<Task> {
    return this.api.put(`/field/tasks/${id}/checklist`, { items });
  }

  uploadPhotos(id: Uuid, files: readonly File[], checklistKey?: string): Observable<Task> {
    return this.api.upload(`/field/tasks/${id}/photos`, filesForm('photos', files, { checklistKey }));
  }

  /** Needs every required checklist item and the minimum photos. */
  complete(id: Uuid, notes?: string | null): Observable<Task> {
    return this.api.post(`/field/tasks/${id}/complete`, notes ? { notes } : {});
  }

  block(id: Uuid, reason: string): Observable<Task> {
    return this.api.post(`/field/tasks/${id}/block`, { reason });
  }

  /** Photographers: send a photo shoot to QA (instead of `complete`). */
  submitShoot(id: Uuid): Observable<Task> {
    return this.api.post(`/field/tasks/${id}/submit`);
  }

  // ---------- incidents ----------

  reportIncident(body: { unitId: Uuid; bookingId?: Uuid; category: IncidentCategory; severity?: IncidentSeverity; description: string }): Observable<Incident> {
    return this.api.post('/field/incidents', body);
  }

  incident(id: Uuid): Observable<Incident> {
    return this.api.get(`/field/incidents/${id}`);
  }

  addIncidentPhotos(id: Uuid, files: readonly File[]): Observable<Incident> {
    return this.api.upload(`/field/incidents/${id}/photos`, filesForm('photos', files));
  }

  // ---------- damage cases ----------

  damageCases(query: PageQuery & { status?: string; propertyId?: Uuid } = {}): Observable<Page<DamageCase>> {
    return this.api.page('/field/damage-cases', { ...query });
  }

  damageCase(id: Uuid): Observable<DamageCase> {
    return this.api.get(`/field/damage-cases/${id}`);
  }

  openDamageCase(body: OpenDamageCaseBody): Observable<DamageCase> {
    return this.api.post('/field/damage-cases', body);
  }

  addDamagePhotos(id: Uuid, files: readonly File[]): Observable<DamageCase> {
    return this.api.upload(`/field/damage-cases/${id}/photos`, filesForm('photos', files));
  }
}
