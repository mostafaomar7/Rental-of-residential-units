import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PageMeta } from '@api/api.types';
import { IconComponent } from '@shared/ui/icon/icon.component';

/** Previous / next pager for a paginated list; hidden when everything fits on one page. */
@Component({
  selector: 'app-pager',
  imports: [TranslatePipe, IconComponent],
  template: `
    @let m = meta();
    @if (m.totalPages > 1) {
      <div class="row between mt-16">
        <button type="button" class="btn btn-ghost btn-sm" [disabled]="m.page <= 1" (click)="pageChange.emit(m.page - 1)">
          <app-icon name="chevron-right" size="sm" [mirror]="true" />{{ 'operator.common.prev' | translate }}
        </button>
        <span class="small muted">{{ 'operator.common.pageOf' | translate: { page: m.page, total: m.totalPages } }}</span>
        <button type="button" class="btn btn-ghost btn-sm" [disabled]="m.page >= m.totalPages" (click)="pageChange.emit(m.page + 1)">
          {{ 'operator.common.next' | translate }}<app-icon name="chevron-left" size="sm" [mirror]="true" />
        </button>
      </div>
    }
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagerComponent {
  readonly meta = input.required<PageMeta>();
  readonly pageChange = output<number>();
}
