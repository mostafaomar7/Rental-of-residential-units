import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { AuthSrcDirective } from '@shared/directives/auth-src.directive';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { AdminQueuesService } from '../../admin-queues.service';
import { PagerComponent } from '../../components/pager.component';
import { ResourceStateComponent } from '../../components/resource-state.component';
import { ShootRequestsComponent } from './shoot-requests.component';
import { ShootReviewCardComponent } from './shoot-review-card.component';

const PAGE_SIZE = 5;
/** Finished shoots sampled for the "recently reviewed" strip, and photos shown from them. */
const RECENT_SHOOTS = 3;
const RECENT_LIMIT = 12;

/**
 * `/admin/photos` — QA of submitted photo shoots (there is no admin list endpoint: the host task
 * list is open to admins). Results flow back to the photographer; a rejected photo means a retake.
 */
@Component({
  selector: 'app-photo-qa-page',
  imports: [TranslatePipe, AuthSrcDirective, PageHeaderComponent, EmptyStateComponent, ModalComponent, IconComponent, PagerComponent, ResourceStateComponent, ShootRequestsComponent, ShootReviewCardComponent],
  templateUrl: './photo-qa.page.html',
  styles: `
    .recent {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    }
    .recent img {
      height: 100px;
    }
    .recent-label {
      padding: 6px;
    }
    .zoomed {
      width: 100%;
      border-radius: 16px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoQaPage {
  private readonly api = inject(HostOperationsApi);
  protected readonly queues = inject(AdminQueuesService);

  protected readonly currentPage = signal(1);
  protected readonly zoomed = signal<string | null>(null);

  protected readonly shoots = rxResource({
    params: () => ({ type: ['PHOTO_SHOOT' as const], status: ['SUBMITTED' as const], page: this.currentPage(), limit: PAGE_SIZE }),
    stream: ({ params }) => this.api.tasks(params),
  });

  private readonly done = rxResource({
    stream: () => this.api.tasks({ type: ['PHOTO_SHOOT'], status: ['DONE'], limit: RECENT_SHOOTS }),
  });

  protected readonly recent = computed(() =>
    this.done.hasValue()
      ? this.done
          .value()
          .items.flatMap((t) => t.photos)
          .filter((p) => p.review === 'APPROVED' || p.review === 'REJECTED')
          .slice(0, RECENT_LIMIT)
      : [],
  );

  protected onReviewed(): void {
    this.shoots.reload();
    this.done.reload();
    this.queues.refresh();
  }
}
