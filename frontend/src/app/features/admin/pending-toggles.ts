import { signal } from '@angular/core';

/**
 * State of on/off switches whose change is saved through the API. Bind `[checked]` to
 * {@link value}: it follows the click while the request runs and snaps back when it fails
 * (a switch keeps its own state, so the binding has to change for it to be reset).
 */
export class PendingToggles {
  private readonly overrides = signal<Readonly<Record<string, boolean>>>({});

  value(id: string, saved: boolean): boolean {
    return this.overrides()[id] ?? saved;
  }

  isPending(id: string): boolean {
    return id in this.overrides();
  }

  /** The user flipped the switch; the request is starting. */
  start(id: string, value: boolean): void {
    this.overrides.update((o) => ({ ...o, [id]: value }));
  }

  /** Saved: the list now holds the new value. */
  done(id: string): void {
    this.overrides.update(({ [id]: _, ...rest }) => rest);
  }

  /** Not saved: show the previous value again. */
  failed(id: string, previous: boolean): void {
    this.overrides.update((o) => ({ ...o, [id]: previous }));
    setTimeout(() => this.done(id));
  }
}
