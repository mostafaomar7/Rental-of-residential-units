import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { EMPTY, catchError, map, switchMap, timer } from 'rxjs';
import { AppNotification } from '@api/dto';
import { MeApi } from '@api/endpoints/me.api';
import { AuthService } from '@core/services/auth.service';
import { PortalService } from '@core/services/portal.service';
import { ToastService } from '@core/services/toast.service';
import { RelTimePipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoadStateComponent } from '../load-state/load-state.component';

const UNREAD_POLL_MS = 60_000;
const PAGE_SIZE = 20;

/** Where a notification leads, from the ids in its `data`. */
function linkOf(notification: AppNotification): string | null {
  const data = notification.data;
  if (typeof data['link'] === 'string' && data['link'].startsWith('/')) return data['link'];
  if (typeof data['bookingId'] === 'string') return '/account/bookings';
  if (typeof data['damageCaseId'] === 'string') return '/account/claims';
  if (typeof data['reviewId'] === 'string') return '/account/reviews';
  return null;
}

/**
 * Header bell for signed-in guests (SRS §NTF): unread badge polled every minute, and a popover
 * with the latest notifications loaded when opened.
 */
@Component({
  selector: 'app-notifications-popover',
  imports: [TranslatePipe, RelTimePipe, LocalizePipe, IconComponent, EmptyStateComponent, LoadStateComponent],
  template: `
    @if (auth.isLoggedIn()) {
      <button type="button" class="hbtn" [attr.aria-label]="'guest.notifications.title' | translate" [attr.aria-expanded]="open()" (click)="toggle()">
        <app-icon name="bell" />
        @if (unread()) {
          <span class="count">{{ unread() }}</span>
        }
      </button>
    }

    @if (open()) {
      <div class="pop" role="dialog" [attr.aria-label]="'guest.notifications.title' | translate">
        <div class="pop-h">
          <b>{{ 'guest.notifications.title' | translate }}</b>
          <button type="button" class="link xs" [disabled]="busy() || !unread()" (click)="markAllRead()">{{ 'guest.notifications.readAll' | translate }}</button>
        </div>
        <div class="list">
          @if (list.hasValue()) {
            @for (n of list.value(); track n.id) {
              <button type="button" class="notif" [class.unread]="!n.readAt" (click)="openNotification(n)">
                <span class="li-ic gold"><app-icon name="bell" size="sm" /></span>
                <span class="grow">
                  <span class="b small t d-block">{{ n | loc: 'title' }}</span>
                  <span class="xs muted d-block">{{ n | loc: 'body' }}</span>
                  <span class="xs muted-2">{{ n.createdAt | relTime }}</span>
                </span>
              </button>
            } @empty {
              <app-empty-state icon="bell-off" [title]="'guest.notifications.empty' | translate" />
            }
          } @else {
            <app-load-state [error]="list.error()" (retry)="list.reload()" />
          }
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
    }
    .list {
      max-height: 380px;
      overflow-y: auto;
    }
    .notif {
      text-align: start;
    }
    :host-context([dir='ltr']) .pop {
      left: auto;
      right: 0;
    }
  `,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'open.set(false)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPopoverComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  private readonly meApi = inject(MeApi);
  private readonly toast = inject(ToastService);
  private readonly portal = inject(PortalService);
  protected readonly auth = inject(AuthService);

  protected readonly open = signal(false);
  protected readonly busy = signal(false);
  protected readonly unread = signal(0);

  protected readonly list = rxResource({
    params: () => (this.open() ? {} : undefined),
    stream: () => this.meApi.notifications({ limit: PAGE_SIZE }).pipe(map((page) => page.items)),
  });

  private readonly signedIn = computed(() => this.auth.isLoggedIn());

  constructor() {
    // Unread badge: polled while signed in (no sockets).
    toObservable(this.signedIn)
      .pipe(
        switchMap((signedIn) => (signedIn ? timer(0, UNREAD_POLL_MS) : EMPTY)),
        // A failed poll keeps the last count; the next tick tries again.
        switchMap(() => this.meApi.unreadCount().pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(),
      )
      .subscribe(({ count }) => this.unread.set(count));

    effect(() => {
      if (!this.signedIn()) this.unread.set(0);
    });
    // Close on navigation.
    effect(() => {
      this.portal.url();
      this.open.set(false);
    });
  }

  protected toggle(): void {
    this.open.update((open) => !open);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  protected markAllRead(): void {
    this.busy.set(true);
    this.meApi.markAllRead().subscribe({
      next: () => {
        this.busy.set(false);
        this.unread.set(0);
        this.list.reload();
        this.toast.success('guest.notifications.allRead');
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }

  /** Marks the notification read (fire and forget) and follows its link, if any. */
  protected openNotification(notification: AppNotification): void {
    if (!notification.readAt) {
      this.meApi.markRead(notification.id).subscribe({ error: () => undefined });
      this.unread.update((n) => Math.max(0, n - 1));
      this.list.update((items) => items?.map((n) => (n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n)));
    }
    const link = linkOf(notification);
    if (!link) return;
    this.open.set(false);
    void this.router.navigateByUrl(link);
  }
}
