import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

export type StatTone = '' | 'gold' | 'green' | 'red' | 'black';

/**
 * KPI tile: icon, big value, label and an optional sub-line. Texts are already formatted/translated.
 * `trend` (e.g. `▲ 6%`) is shown coloured before the sub-line; `trendDown` switches it to red.
 */
@Component({
  selector: 'app-stat-tile',
  imports: [IconComponent],
  template: `
    <div class="stat">
      <div class="stat-ic" [class]="tone()"><app-icon [name]="icon()" /></div>
      <div class="stat-v num">{{ value() }}</div>
      <div class="stat-l">{{ label() }}</div>
      @if (sub() || trend()) {
        <div class="stat-s">
          @if (trend()) {
            <span [class]="trendDown() ? 'trend-down' : 'trend-up'">{{ trend() }}</span>
          }
          {{ sub() }}
        </div>
      }
    </div>
  `,
  styles: `:host { display: block; min-width: 0; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatTileComponent {
  readonly icon = input.required<string>();
  readonly value = input.required<string | number>();
  readonly label = input.required<string>();
  readonly sub = input<string>();
  readonly trend = input<string>();
  readonly trendDown = input(false);
  readonly tone = input<StatTone>('');
}
