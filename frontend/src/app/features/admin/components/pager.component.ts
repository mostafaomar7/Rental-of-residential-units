import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PageMeta } from '@api/api.types';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';

/** Previous / next pagination under a list, with the total count. */
@Component({
  selector: 'app-pager',
  imports: [TranslatePipe, FORMAT_PIPES, IconComponent],
  template: `
    @let m = meta();
    <div class="row between wrap mt-16 small">
      <span class="muted">{{ 'admin.common.pageOf' | translate: { page: m.page, pages: m.totalPages || 1, total: (m.total | num) } }}</span>
      @if (m.totalPages > 1) {
        <div class="row">
          <button type="button" class="btn btn-ghost btn-xs" [disabled]="m.page <= 1" (click)="pageChange.emit(m.page - 1)">
            <app-icon name="chevron-right" size="sm" [mirror]="true" />{{ 'admin.common.previous' | translate }}
          </button>
          <button type="button" class="btn btn-ghost btn-xs" [disabled]="m.page >= m.totalPages" (click)="pageChange.emit(m.page + 1)">
            {{ 'admin.common.next' | translate }}<app-icon name="chevron-left" size="sm" [mirror]="true" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagerComponent {
  readonly meta = input.required<PageMeta>();
  readonly pageChange = output<number>();
}
