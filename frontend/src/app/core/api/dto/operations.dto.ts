import { ApiDate, ApiInstant, ApiTime, Bilingual, Uuid } from '../api.types';
import { Role } from './user.dto';

/** Operations photo (task / incident / damage evidence). Private: load it with the `authSrc` directive. */
export interface OpsPhoto {
  id: Uuid;
  /** `/api/v1/ops-photos/:id/lg` — needs the Authorization header. */
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  checklistKey: string | null;
  /** Photo-shoot QA (PHOTO_SHOOT tasks only). */
  review?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  reviewReason?: string | null;
  createdAt: ApiInstant;
}

// ---------- tasks ----------

export type TaskType = 'READINESS' | 'INSPECTION' | 'CLEANING' | 'MAINTENANCE' | 'PHOTO_SHOOT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'SUBMITTED' | 'DONE' | 'BLOCKED' | 'CANCELLED';

export interface ChecklistItem {
  key: string;
  done: boolean;
  note: string | null;
  labelAr: string;
  labelEn: string;
  required: boolean;
}

export interface Task {
  id: Uuid;
  type: TaskType;
  status: TaskStatus;
  title: string;
  notes: string | null;
  dueAt: ApiInstant;
  overdue: boolean;
  property: { id: Uuid; nameAr: string; address: string | null; navigationUrl: string | null };
  unit: { id: Uuid; name: string; status: string } | null;
  booking: { id: Uuid; number: string; guestName: string; checkIn: ApiDate; checkInTime: ApiTime } | null;
  assignee: { id: Uuid; fullName: string; role: Role } | null;
  checklist: ChecklistItem[];
  photos: OpsPhoto[];
  blockedReason: string | null;
  reviewNote: string | null;
  startedAt: ApiInstant | null;
  completedAt: ApiInstant | null;
  createdAt: ApiInstant;
}

export interface TaskBoardMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  /** Counts per status. */
  board: Partial<Record<TaskStatus, number>>;
}

export interface ChecklistUpdate {
  key: string;
  done: boolean;
  note?: string | null;
}

// ---------- incidents ----------

export type IncidentCategory = 'MAINTENANCE' | 'CLEANLINESS' | 'LOCK' | 'INTERNET' | 'NOISE' | 'SAFETY' | 'DAMAGE' | 'OTHER';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface Incident {
  id: Uuid;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  reporterType: 'GUEST' | 'STAFF';
  property: { id: Uuid; nameAr: string };
  unit: { id: Uuid; name: string };
  booking: { id: Uuid; number: string } | null;
  photos: OpsPhoto[];
  tasks: Pick<Task, 'id' | 'type' | 'status' | 'title'>[];
  resolution: string | null;
  resolvedAt: ApiInstant | null;
  createdAt: ApiInstant;
}

export interface ReportIncidentBody {
  category: IncidentCategory;
  severity?: IncidentSeverity;
  description: string;
}

// ---------- damage cases ----------

export type DamageStatus =
  | 'OPENED'
  | 'UNDER_REVIEW'
  | 'GUEST_NOTIFIED'
  | 'DISPUTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SETTLED'
  | 'CLOSED';

export interface DamageEvent {
  from: DamageStatus | null;
  to: DamageStatus;
  note: string | null;
  at: ApiInstant;
  actorId?: Uuid;
}

export interface DamageCase {
  id: Uuid;
  number: string;
  status: DamageStatus;
  booking: { id: Uuid; number: string; guestName: string; checkIn: ApiDate; checkOut: ApiDate };
  property: Bilingual & { id: Uuid };
  description: string;
  amountClaimed: number;
  amountApproved: number | null;
  reviewNote: string | null;
  objectionDeadline: ApiInstant | null;
  objection: string | null;
  finalNote: string | null;
  settlement: { method: 'WALLET' | 'EXTERNAL'; ref: string | null; at: ApiInstant } | null;
  photos: OpsPhoto[];
  events: DamageEvent[];
  taskId?: Uuid | null;
  incidentId?: Uuid | null;
  openedById?: Uuid;
  createdAt: ApiInstant;
}

export interface OpenDamageCaseBody {
  bookingId: Uuid;
  description: string;
  amountClaimed: number;
  taskId?: Uuid;
  incidentId?: Uuid;
}
