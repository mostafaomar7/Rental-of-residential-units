import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '../icon/icon.component';

export interface TabItem<T extends string = string> {
  id: T;
  /** Translation key. */
  label: string;
  icon?: string;
  /** Optional counter badge. */
  count?: number;
}

export interface TabLink {
  /** Translation key. */
  label: string;
  link: string | unknown[];
  icon?: string;
}

/** In-page tabs bound to a value: `<app-tabs [items]="tabs" [(active)]="tab" />`. */
@Component({
  selector: 'app-tabs',
  imports: [IconComponent, TranslatePipe],
  template: `
    <div class="tabs" [class]="variant()" role="tablist">
      @for (tab of items(); track tab.id) {
        <button type="button" role="tab" class="tab" [class.on]="tab.id === active()" [attr.aria-selected]="tab.id === active()" (click)="active.set(tab.id)">
          @if (tab.icon) {
            <app-icon [name]="tab.icon" size="sm" />
          }
          {{ tab.label | translate }}
          @if (tab.count != null) {
            <span class="pill pill-gray">{{ tab.count }}</span>
          }
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {
  readonly items = input.required<readonly TabItem[]>();
  readonly active = model.required<string>();
  /** Extra class on the tab strip, e.g. `tabs-line`. */
  readonly variant = input('');
}

/** Tabs that navigate between routes. */
@Component({
  selector: 'app-tab-links',
  imports: [IconComponent, TranslatePipe, RouterLink, RouterLinkActive],
  template: `
    <nav class="tabs" [class]="variant()">
      @for (tab of items(); track tab.label) {
        <a class="tab" [routerLink]="tab.link" routerLinkActive="on" ariaCurrentWhenActive="page">
          @if (tab.icon) {
            <app-icon [name]="tab.icon" size="sm" />
          }
          {{ tab.label | translate }}
        </a>
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabLinksComponent {
  readonly items = input.required<readonly TabLink[]>();
  readonly variant = input('');
}
