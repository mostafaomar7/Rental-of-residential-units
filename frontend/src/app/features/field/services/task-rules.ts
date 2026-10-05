import { Task, TaskStatus } from '@api/dto';

/** Statuses after which the field user can no longer work on a task. */
const CLOSED: readonly TaskStatus[] = ['SUBMITTED', 'DONE', 'CANCELLED'];

export function isClosed(task: Task): boolean {
  return CLOSED.includes(task.status);
}

/** Checklist, photos and hand-over are open only while the task is in progress. */
export function isWorkable(task: Task): boolean {
  return task.status === 'IN_PROGRESS';
}

/** Start claims an unassigned task; blocked tasks are resumed the same way. */
export function canStart(task: Task): boolean {
  return task.status === 'TODO' || task.status === 'BLOCKED';
}

export function checklistProgress(task: Task): { done: number; total: number; percent: number } {
  const done = task.checklist.filter((c) => c.done).length;
  const total = task.checklist.length;
  return { done, total, percent: total ? (done / total) * 100 : 0 };
}

/** Day order: overdue first, then by due time. */
export function byUrgency(a: Task, b: Task): number {
  return Number(b.overdue) - Number(a.overdue) || a.dueAt.localeCompare(b.dueAt);
}

/** A photo shoot QA sent back: open again with a review note or rejected photos. */
export function needsRetake(task: Task): boolean {
  return !isClosed(task) && (!!task.reviewNote || task.photos.some((p) => p.review === 'REJECTED'));
}
