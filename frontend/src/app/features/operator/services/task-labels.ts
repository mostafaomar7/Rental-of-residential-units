import { Task } from '@api/dto';

/** Label key for a task nobody is assigned to; Rawaaf assigns photographers to photo shoots. */
export function unassignedKey(task: Pick<Task, 'type'>): string {
  return task.type === 'PHOTO_SHOOT' ? 'operations.tasks.awaitingPhotographer' : 'operations.tasks.unassigned';
}
