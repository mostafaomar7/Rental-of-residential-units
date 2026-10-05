import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DoorCode } from '@api/dto';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';

/** Shows a door code the API just generated (test code, emergency code) with its validity. Render with `@if`. */
@Component({
  selector: 'app-door-code-modal',
  imports: [TranslatePipe, AppDatePipe, IconComponent, ModalComponent],
  template: `
    @let c = code();
    <app-modal size="sm" [title]="title()" [subtitle]="subtitle()" (closed)="closed.emit()">
      <div class="center">
        <div class="li-ic big-ic" [class]="tone()"><app-icon [name]="icon()" size="lg" /></div>
        <div class="code-box mt-12 navy ltr">{{ c.code }}#</div>
        <p class="small muted mt-8">
          {{ 'operations.locks.codeValidity' | translate: { from: (c.validFrom | appDate: 'dateTime'), to: (c.validTo | appDate: 'dateTime') } }}
        </p>
        <span class="pill pill-gray">{{ 'operations.locks.mode.' + c.mode | translate }}</span>
      </div>
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" (click)="closed.emit()">{{ 'operations.common.done' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  styles: `
    .big-ic {
      width: 60px;
      height: 60px;
      margin: 0 auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoorCodeModalComponent {
  readonly code = input.required<DoorCode>();
  /** Translated texts. */
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly icon = input('key-round');
  readonly tone = input<'green' | 'red'>('green');
  readonly closed = output<void>();
}
