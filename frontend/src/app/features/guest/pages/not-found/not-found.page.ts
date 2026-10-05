import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, TranslatePipe, EmptyStateComponent],
  template: `
    <div class="container">
      <div class="card card-p mt-24">
        <app-empty-state icon="map-pin-off" [title]="'common.notFound.title' | translate" [subtitle]="'common.notFound.body' | translate">
          <a class="btn btn-primary mt-16" routerLink="/">{{ 'common.notFound.home' | translate }}</a>
        </app-empty-state>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}
