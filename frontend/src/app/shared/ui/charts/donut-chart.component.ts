import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FormatService } from '@core/services/format.service';

export interface DonutPart {
  label: string;
  value: number;
  color: string;
}

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Donut chart with a centre label and a legend. */
@Component({
  selector: 'app-donut-chart',
  template: `
    <div class="row gap-16 wrap">
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" [attr.aria-label]="label()">
        @for (s of segments(); track $index) {
          <circle
            [attr.r]="radius"
            cx="70"
            cy="70"
            fill="none"
            stroke-width="18"
            transform="rotate(-90 70 70)"
            [attr.stroke]="s.color"
            [attr.stroke-dasharray]="s.dash"
            [attr.stroke-dashoffset]="s.offset"
          >
            <title>{{ s.label }}: {{ s.text }}</title>
          </circle>
        }
        <text x="70" y="68" text-anchor="middle" font-size="20" font-weight="900" fill="#0A1931">{{ center() }}</text>
        <text x="70" y="88" text-anchor="middle" font-size="11" fill="rgba(0,0,0,.45)">{{ centerSub() }}</text>
      </svg>
      <div class="stack-sm">
        @for (s of segments(); track $index) {
          <div class="row small">
            <i class="legend-dot" [style.background]="s.color"></i>
            <span class="b">{{ s.label }}</span>
            <span class="muted">{{ s.text }}{{ unit() }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 3px;
      display: inline-block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonutChartComponent {
  private readonly format = inject(FormatService);

  readonly parts = input.required<readonly DonutPart[]>();
  readonly center = input('');
  readonly centerSub = input('');
  readonly unit = input('');
  readonly label = input('');

  protected readonly radius = RADIUS;

  protected readonly segments = computed(() => {
    const parts = this.parts();
    const total = parts.reduce((sum, p) => sum + p.value, 0) || 1;
    let acc = 0;
    return parts.map((p) => {
      const len = (p.value / total) * CIRCUMFERENCE;
      const segment = { ...p, text: this.format.num(p.value), dash: `${len} ${CIRCUMFERENCE - len}`, offset: -acc };
      acc += len;
      return segment;
    });
  });
}
