import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class ClipboardService {
  private readonly toast = inject(ToastService);

  async copy(text: string, messageKey = 'common.copied'): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      this.legacyCopy(text);
    }
    this.toast.success(messageKey);
  }

  /** Fallback for insecure contexts (e.g. `file://`) where the Clipboard API is unavailable. */
  private legacyCopy(text: string): void {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}
