import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface BarItem {
  label: string;
  value: number;
  /** Display text for the value (defaults to the raw number). */
  text?: string;
  /** Highlight the bar in gold. */
  gold?: boolean;
}

/** Simple vertical bar chart built on the design system's `.bars` styles. */
@Component({
  selector: 'app-bar-chart',
  template: `
    <div class="bars" [style.height.px]="height()">
      @for (bar of bars(); track $index) {
        <div class="b-col" [attr.title]="bar.label + ': ' + bar.display">
          <div class="xs bb muted">{{ showValues() ? bar.display : '' }}</div>
          <div class="b" [class.gold]="bar.gold" [style.height.%]="bar.percent"></div>
          <div class="bl">{{ bar.label }}</div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarChartComponent {
  readonly items = input.required<readonly BarItem[]>();
  readonly height = input(180);
  readonly max = input<number>();
  readonly showValues = input(false);

  protected readonly bars = computed(() => {
    const items = this.items();
    const max = this.max() ?? (Math.max(...items.map((i) => i.value)) || 1);
    return items.map((i) => ({ ...i, display: i.text ?? String(i.value), percent: Math.max(3, (i.value / max) * 100) }));
  });
}
