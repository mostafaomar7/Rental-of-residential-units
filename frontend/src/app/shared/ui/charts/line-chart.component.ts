import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LangService } from '@core/services/lang.service';
import { FormatService } from '@core/services/format.service';

interface Point {
  x: number;
  y: number;
  label: string;
  value: number;
}

const WIDTH = 640;
const PAD = { start: 8, end: 40, top: 12, bottom: 26 };
const GRID_LINES = 4;

let gradientSeq = 0;

/**
 * Area/line chart. The first value is drawn at the reading start (right in RTL, left in LTR).
 * Optional `compare` series is drawn dashed in gold (e.g. previous period).
 */
@Component({
  selector: 'app-line-chart',
  template: `
    <svg class="chart" [attr.viewBox]="'0 0 ' + width + ' ' + height()" role="img" [attr.aria-label]="label()">
      <defs>
        <linearGradient [attr.id]="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#C9A86A" stop-opacity=".35" />
          <stop offset="1" stop-color="#C9A86A" stop-opacity="0" />
        </linearGradient>
      </defs>
      @for (g of grid(); track $index) {
        <line [attr.x1]="plotStart" [attr.x2]="plotEnd" [attr.y1]="g.y" [attr.y2]="g.y" stroke="rgba(0,0,0,.06)" />
        <text [attr.x]="axisX" [attr.y]="g.y + 4" text-anchor="start">{{ g.text }}</text>
      }
      @for (p of xLabels(); track $index) {
        <text [attr.x]="p.x" [attr.y]="height() - 6" text-anchor="middle">{{ p.label }}</text>
      }
      <path [attr.d]="areaPath()" [attr.fill]="'url(#' + gradientId + ')'" />
      @if (comparePath()) {
        <path [attr.d]="comparePath()" fill="none" stroke="#C9A86A" stroke-width="2" stroke-dasharray="5 5" />
      }
      <path [attr.d]="linePath()" fill="none" stroke="#0A1931" stroke-width="2.5" stroke-linejoin="round" />
      @if (points().length <= 16) {
        @for (p of points(); track $index) {
          <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3.5" fill="#fff" stroke="#0A1931" stroke-width="2">
            <title>{{ p.label }}: {{ formatTip()(p.value) }}</title>
          </circle>
        }
      }
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChartComponent {
  private readonly lang = inject(LangService);
  private readonly format = inject(FormatService);

  readonly values = input.required<readonly number[]>();
  readonly compare = input<readonly number[]>();
  readonly labels = input<readonly string[]>([]);
  readonly height = input(220);
  readonly max = input<number>();
  readonly maxLabels = input(9);
  /** Accessible description. */
  readonly label = input('');
  readonly formatY = input<(v: number) => string>((v) => this.format.num(Math.round(v)));
  readonly formatTip = input<(v: number) => string>((v) => this.format.num(v));

  protected readonly width = WIDTH;
  protected readonly gradientId = `lc-grad-${++gradientSeq}`;
  protected readonly plotStart = PAD.start;
  protected readonly plotEnd = WIDTH - PAD.end;
  /** Y-axis labels sit in the end padding in both directions. */
  protected readonly axisX = WIDTH - PAD.end + 6;

  private readonly rtl = computed(() => this.lang.dir() === 'rtl');
  private readonly yMax = computed(() => this.max() ?? Math.max(...this.values(), ...(this.compare() ?? []), 1) * 1.12);


  protected readonly points = computed<Point[]>(() => this.toPoints(this.values()));

  protected readonly grid = computed(() =>
    Array.from({ length: GRID_LINES + 1 }, (_, g) => {
      const value = (this.yMax() * g) / GRID_LINES;
      return { y: this.y(value), text: this.formatY()(value) };
    }),
  );

  protected readonly xLabels = computed(() => {
    const pts = this.points();
    const step = Math.ceil(pts.length / this.maxLabels());
    return pts.filter((_, i) => i % step === 0);
  });

  protected readonly linePath = computed(() => this.path(this.points()));
  protected readonly comparePath = computed(() => {
    const compare = this.compare();
    return compare?.length ? this.path(this.toPoints(compare)) : '';
  });
  protected readonly areaPath = computed(() => {
    const pts = this.points();
    if (!pts.length) return '';
    const base = this.y(0);
    return `${this.path(pts)} L${pts.at(-1)!.x} ${base} L${pts[0].x} ${base} Z`;
  });

  private toPoints(values: readonly number[]): Point[] {
    const n = values.length;
    const span = WIDTH - PAD.start - PAD.end;
    const labels = this.labels();
    return values.map((value, i) => {
      const offset = (i * span) / Math.max(1, n - 1);
      const x = this.rtl() ? WIDTH - PAD.end - offset : PAD.start + offset;
      return { x: +x.toFixed(1), y: +this.y(value).toFixed(1), label: labels[i] ?? '', value };
    });
  }

  private y(value: number): number {
    return PAD.top + (this.height() - PAD.top - PAD.bottom) * (1 - value / (this.yMax() || 1));
  }

  private path(points: Point[]): string {
    return points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  }
}
