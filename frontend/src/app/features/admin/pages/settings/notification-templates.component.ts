import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { NotificationTemplate } from '@api/dto';
import { AdminConfigApi } from '@api/endpoints/admin-config.api';
import { ClipboardService } from '@core/services/clipboard.service';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ResourceStateComponent } from '../../components/resource-state.component';

type TemplateTexts = Pick<NotificationTemplate, 'titleAr' | 'titleEn' | 'bodyAr' | 'bodyEn'>;

const EMPTY_TEXTS: TemplateTexts = { titleAr: '', titleEn: '', bodyAr: '', bodyEn: '' };

/** Notification templates: pick one, edit its Arabic / English texts with the allowed variables, reset to default. */
@Component({
  selector: 'app-notification-templates',
  imports: [FormsModule, TranslatePipe, FORMAT_PIPES, IconComponent, FieldComponent, EmptyStateComponent, ResourceStateComponent],
  templateUrl: './notification-templates.component.html',
  styles: `
    :host {
      display: block;
    }
    .layout {
      gap: 24px;
      align-items: start;
    }
    .list {
      max-height: 640px;
      overflow-y: auto;
    }
    .tpl {
      width: 100%;
      text-align: start;
    }
    .tpl.on {
      border-color: var(--navy);
      background: #fbfaf7;
    }
    textarea {
      min-height: 90px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationTemplatesComponent {
  private readonly api = inject(AdminConfigApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly clipboard = inject(ClipboardService);

  protected readonly templates = rxResource({ stream: () => this.api.notificationTemplates() });
  protected readonly selectedKey = signal<string | null>(null);
  protected readonly selected = computed(() => (this.templates.hasValue() ? (this.templates.value().find((t) => t.key === this.selectedKey()) ?? null) : null));
  /** Editor texts, reloaded from the selected template whenever it changes. */
  protected readonly draft = linkedSignal<TemplateTexts>(() => {
    const t = this.selected();
    return t ? { titleAr: t.titleAr, titleEn: t.titleEn, bodyAr: t.bodyAr, bodyEn: t.bodyEn } : EMPTY_TEXTS;
  });
  protected readonly busy = signal(false);

  /** `{{name}}` placeholder as written in the texts (built here so the template engine leaves it alone). */
  protected token(variable: string): string {
    return `{{${variable}}}`;
  }

  protected setText(field: keyof TemplateTexts, value: string): void {
    this.draft.update((d) => ({ ...d, [field]: value }));
  }

  protected save(template: NotificationTemplate): void {
    const d = this.draft();
    if (!d.titleAr.trim() || !d.titleEn.trim() || !d.bodyAr.trim() || !d.bodyEn.trim()) return this.toast.error('admin.templates.allRequired');
    this.run(template, this.api.updateNotificationTemplate(template.key, d), 'admin.templates.saved');
  }

  protected async reset(template: NotificationTemplate): Promise<void> {
    const ok = await this.confirm.ask({ title: 'admin.templates.resetTitle', message: 'admin.templates.resetMessage', messageParams: { key: template.key }, okLabel: 'admin.settings.reset' });
    if (ok) this.run(template, this.api.resetNotificationTemplate(template.key), 'admin.templates.resetDone');
  }

  private run(template: NotificationTemplate, request: Observable<NotificationTemplate>, successKey: string): void {
    this.busy.set(true);
    request.subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.templates.update((list) => list?.map((t) => (t.key === template.key ? updated : t)));
        this.toast.success(successKey);
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
