import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PropertyRow } from '@api/dto';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';

/** One property in the review queue: summary and the button that opens the full review. */
@Component({
  selector: 'app-verification-card',
  imports: [TranslatePipe, FORMAT_PIPES, LocalizePipe, IconComponent, StatusPillComponent],
  template: `
    @let p = property();
    <div class="card card-p">
      <div class="row-top wrap gap-20">
        @if (p.coverUrl) {
          <img class="vr-img" [src]="p.coverUrl" alt="" />
        } @else {
          <div class="vr-img thumb-ph"><app-icon name="image" size="lg" /></div>
        }
        <div class="grow vr-body">
          <div class="row"><app-status-pill domain="property" [code]="p.status" /></div>
          <h3 class="h3 mt-4">{{ p.nameAr }}</h3>
          <div class="small muted">
            {{ p.type | loc }}
            @if (p.city) {
              • {{ p.city | loc }}
            }
            • {{ p.unitsCount | plural: 'admin.verification.units' }} • {{ 'admin.verification.owner' | translate: { name: p.owner.fullName } }}
            @if (p.submittedAt) {
              • {{ 'admin.verification.submitted' | translate: { date: p.submittedAt | appDate: 'medium' } }}
            }
          </div>

          <div class="row wrap mt-12 small">
            @if (p.operatingModel) {
              <span class="pill pill-navy">{{ 'domain.api.operatingModel.' + p.operatingModel | translate }}</span>
            }
            @if (p.fromPrice != null) {
              <span class="pill pill-gray">{{ 'admin.verification.fromPrice' | translate: { amount: p.fromPrice | sar } }}</span>
            }
          </div>

          <div class="row wrap mt-16">
            <button type="button" class="btn btn-primary btn-sm" (click)="review.emit()"><app-icon name="search-check" size="sm" />{{ 'admin.verification.review' | translate }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .vr-img {
      width: 180px;
      max-width: 100%;
      height: 130px;
      object-fit: cover;
      border-radius: 16px;
    }
    .vr-body {
      min-width: 240px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationCardComponent {
  readonly property = input.required<PropertyRow>();
  readonly review = output<void>();
}
