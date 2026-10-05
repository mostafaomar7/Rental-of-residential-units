import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  booleanAttribute,
  inject,
  input,
  output,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '../icon/icon.component';

export type ModalSize = '' | 'sm' | 'lg' | 'xl';

/** Open modals, top-most last — only the top one reacts to Escape. */
const openModals: ModalComponent[] = [];

/**
 * Dialog rendered while it exists in the DOM — control it with `@if`:
 *
 * ```html
 * @if (editing()) {
 *   <app-modal [title]="'x.title' | translate" (closed)="editing.set(false)">
 *     …body…
 *     <ng-container modal-footer><button class="btn btn-primary">…</button></ng-container>
 *   </app-modal>
 * }
 * ```
 */
@Component({
  selector: 'app-modal',
  imports: [IconComponent, TranslatePipe],
  template: `
    <div class="modal-back" (mousedown)="onBackdrop($event)">
      <div class="modal" [class]="size()" role="dialog" aria-modal="true" [attr.aria-label]="title()">
        @if (title()) {
          <div class="modal-h">
            <div class="grow">
              <h2>{{ title() }}</h2>
              @if (subtitle()) {
                <p>{{ subtitle() }}</p>
              }
            </div>
            <button type="button" class="x-btn" [attr.aria-label]="'common.close' | translate" (click)="closed.emit()">
              <app-icon name="x" />
            </button>
          </div>
        }
        <div class="modal-b" tabindex="-1"><ng-content /></div>
        <div class="modal-f modal-f-slot"><ng-content select="[modal-footer]" /></div>
      </div>
    </div>
  `,
  styles: `
    .modal-f-slot:empty {
      display: none;
    }
  `,
  host: { '(document:keydown.escape)': 'onEscape()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly title = input('');
  readonly subtitle = input('');
  readonly size = input<ModalSize>('');
  /** When true, clicking the backdrop does not close the dialog. */
  readonly sticky = input(false, { transform: booleanAttribute });
  readonly closed = output<void>();

  constructor() {
    openModals.push(this);
  }

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;
    const focusable = el.querySelector<HTMLElement>('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select');
    (focusable ?? el.querySelector<HTMLElement>('.modal-b'))?.focus({ preventScroll: true });
  }

  ngOnDestroy(): void {
    openModals.splice(openModals.indexOf(this), 1);
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.sticky()) this.closed.emit();
  }

  protected onEscape(): void {
    if (openModals.at(-1) === this) this.closed.emit();
  }
}
