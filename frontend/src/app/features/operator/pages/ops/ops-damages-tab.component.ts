import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { DamageCase } from '@api/dto';
import { FieldApi } from '@api/endpoints/field.api';
import { ToastService } from '@core/services/toast.service';
import { AuthSrcDirective } from '@shared/directives/auth-src.directive';
import { AppDatePipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { LoadErrorComponent, LoadingComponent } from '../../components/async-state.component';
import { OpenDamageDialogComponent } from '../../components/open-damage-dialog.component';
import { PagerComponent } from '../../components/pager.component';
import { Mutation } from '../../services/mutation';

const PAGE_SIZE = 10;

/**
 * Damage cases opened after a stay (SRS §POL): evidence, claimed / approved amounts, the guest's
 * objection and the case history. The platform admin decides; the host opens cases and adds photos.
 */
@Component({
  selector: 'app-ops-damages-tab',
  imports: [
    RouterLink,
    TranslatePipe,
    AuthSrcDirective,
    AppDatePipe,
    SarPipe,
    LocalizePipe,
    EmptyStateComponent,
    IconComponent,
    StatusPillComponent,
    LoadingComponent,
    LoadErrorComponent,
    OpenDamageDialogComponent,
    PagerComponent,
  ],
  templateUrl: './ops-damages-tab.component.html',
  styles: `
    :host {
      display: block;
    }
    .thumbs-row img.evidence {
      width: 120px;
      height: 90px;
    }
    .upload-btn {
      cursor: pointer;
    }
    .upload-btn input {
      display: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpsDamagesTabComponent {
  private readonly api = inject(FieldApi);
  private readonly toast = inject(ToastService);

  protected readonly page = signal(1);
  protected readonly opening = signal(false);
  protected readonly uploading = new Mutation();

  protected readonly resource = rxResource({
    params: () => ({ page: this.page(), limit: PAGE_SIZE }),
    stream: ({ params }) => this.api.damageCases(params),
  });

  /** Evidence can be added until the case is decided. */
  protected canAddPhotos(d: DamageCase): boolean {
    return d.status === 'OPENED' || d.status === 'UNDER_REVIEW';
  }

  protected onPhotos(d: DamageCase, event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;
    this.uploading.run(this.api.addDamagePhotos(d.id, files), (updated) => {
      this.toast.success('operations.damages.toast.photosAdded', { count: files.length });
      this.resource.update((page) => page && { ...page, items: page.items.map((c) => (c.id === updated.id ? updated : c)) });
    });
  }

  protected onOpened(): void {
    this.opening.set(false);
    this.page.set(1);
    this.resource.reload();
  }
}
