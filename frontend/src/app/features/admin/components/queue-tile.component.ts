import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';

export type QueueTone = 'amber' | 'blue' | 'red' | 'gold' | 'green' | 'navy';

/** Clickable work-queue counter on the admin overview. Label is already translated; `null` count = unknown. */
@Component({
  selector: 'app-queue-tile',
  imports: [RouterLink, IconComponent],
  template: `
    <a class="tile row gap-12" [routerLink]="link()" [queryParams]="queryParams()">
      <span class="li-ic" [class]="tone()"><app-icon [name]="icon()" /></span>
      <div class="grow">
        <div class="h3">{{ count() ?? '—' }}</div>
        <div class="xs muted b">{{ label() }}</div>
      </div>
      <app-icon name="chevron-left" size="sm" class="muted" [mirror]="true" />
    </a>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueueTileComponent {
  readonly icon = input.required<string>();
  readonly tone = input.required<QueueTone>();
  readonly count = input.required<number | null>();
  readonly label = input.required<string>();
  readonly link = input.required<string>();
  readonly queryParams = input<Record<string, string> | null>(null);
}
