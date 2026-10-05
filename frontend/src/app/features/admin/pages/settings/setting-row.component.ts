import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { PlatformSetting } from '@api/dto';
import { ToastService } from '@core/services/toast.service';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ToggleComponent } from '@shared/ui/toggle/toggle.component';

type ValueKind = 'number' | 'boolean' | 'string' | 'json';

const JSON_INDENT = 2;

/** Editor kind from the setting's default (falls back to its value). */
function kindOf(setting: PlatformSetting): ValueKind {
  const sample = setting.default ?? setting.value;
  if (typeof sample === 'number') return 'number';
  if (typeof sample === 'boolean') return 'boolean';
  if (typeof sample === 'string') return 'string';
  return 'json';
}

/** Text shown in the editor for a value of the given kind. */
function toText(value: unknown, kind: ValueKind): string {
  if (kind === 'json') return JSON.stringify(value, null, JSON_INDENT);
  return value == null ? '' : String(value);
}

const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** One platform setting: key, description, an editor matching its type, save and reset-to-default. */
@Component({
  selector: 'app-setting-row',
  imports: [FormsModule, TranslatePipe, IconComponent, ToggleComponent],
  template: `
    @let s = setting();
    <div class="row-top wrap gap-16 item">
      <div class="grow info">
        <div class="row wrap">
          <span class="kbd">{{ s.key }}</span>
          @if (s.public) {
            <span class="pill pill-blue">{{ 'admin.settings.public' | translate }}</span>
          }
          @if (customised()) {
            <span class="pill pill-gold">{{ 'admin.settings.customised' | translate }}</span>
          }
        </div>
        <div class="small muted mt-4" dir="auto">{{ s.description }}</div>
      </div>

      <div class="editor">
        @switch (kind()) {
          @case ('boolean') {
            <app-toggle [checked]="checked()" [disabled]="busy()" [label]="s.key" (checkedChange)="toggle($event)" />
          }
          @case ('number') {
            <input class="input" type="number" [attr.aria-label]="s.key" [(ngModel)]="text" />
          }
          @case ('string') {
            <input class="input" [attr.aria-label]="s.key" [(ngModel)]="text" />
          }
          @default {
            <textarea class="textarea code-input ltr" [attr.aria-label]="s.key" [(ngModel)]="text"></textarea>
          }
        }
        <div class="row mt-8">
          @if (kind() !== 'boolean') {
            <button type="button" class="btn btn-primary btn-xs" [disabled]="busy() || !dirty()" (click)="save()">{{ 'common.save' | translate }}</button>
          }
          @if (customised()) {
            <button type="button" class="btn btn-ghost btn-xs" [disabled]="busy()" (click)="reset.emit()"><app-icon name="rotate-ccw" size="sm" />{{ 'admin.settings.reset' | translate }}</button>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .item {
      padding: 14px 0;
    }
    .info {
      min-width: 220px;
      flex-basis: 40%;
    }
    .editor {
      flex: 1;
      min-width: 240px;
    }
    .code-input {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 12px;
      min-height: 110px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingRowComponent {
  private readonly toast = inject(ToastService);

  readonly setting = input.required<PlatformSetting>();
  readonly busy = input(false);
  /** The new value, already typed like the default. */
  readonly saved = output<unknown>();
  readonly reset = output<void>();

  protected readonly kind = computed(() => kindOf(this.setting()));
  protected readonly text = linkedSignal(() => toText(this.setting().value, this.kind()));
  protected readonly dirty = computed(() => String(this.text()) !== toText(this.setting().value, this.kind()));
  protected readonly customised = computed(() => !sameValue(this.setting().value, this.setting().default));
  /** Switch state; reset from the setting whenever the parent hands a new copy (e.g. after a failed save). */
  protected readonly checked = linkedSignal(() => !!this.setting().value);

  protected toggle(value: boolean): void {
    this.checked.set(value);
    this.saved.emit(value);
  }

  protected save(): void {
    const text = String(this.text()).trim();
    switch (this.kind()) {
      case 'number': {
        const value = Number(text);
        if (text === '' || !Number.isFinite(value)) return this.toast.error('admin.settings.numberInvalid');
        return this.saved.emit(value);
      }
      case 'string':
        return this.saved.emit(text);
      default:
        try {
          this.saved.emit(JSON.parse(text));
        } catch {
          this.toast.error('admin.settings.jsonInvalid');
        }
    }
  }
}
