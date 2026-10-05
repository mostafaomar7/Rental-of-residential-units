import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { BookingsApi } from '@api/endpoints/bookings.api';
import { ClipboardService } from '@core/services/clipboard.service';
import { ToastService } from '@core/services/toast.service';
import { saveBlob } from '@core/utils/download.utils';
import { AppDatePipe, NumPipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { LogoComponent } from '@shared/ui/brand/logo.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { KvComponent } from '@shared/ui/kv/kv.component';
import { LoadStateComponent } from '../../components/load-state/load-state.component';

/**
 * Simplified tax invoice of a booking (`/invoice/:bookingId`, ZATCA): issued by the API, with the
 * QR payload (TLV, base64) and the official PDF download.
 */
@Component({
  selector: 'app-invoice-page',
  imports: [RouterLink, TranslatePipe, LocalizePipe, AppDatePipe, NumPipe, SarPipe, LogoComponent, IconComponent, KvComponent, LoadStateComponent],
  templateUrl: './invoice.page.html',
  styles: `
    .toolbar {
      padding-top: 20px;
    }
    .top {
      align-items: flex-start;
    }
    .bottom {
      align-items: flex-end;
    }
    .end-col {
      text-align: end;
    }
    .lines {
      min-width: 480px;
    }
    .totals {
      min-width: 280px;
    }
    .qr-payload {
      max-width: 260px;
      word-break: break-all;
      font-family: monospace;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoicePage {
  readonly id = input.required<Uuid>();

  private readonly bookingsApi = inject(BookingsApi);
  private readonly toast = inject(ToastService);
  private readonly location = inject(Location);
  protected readonly clipboard = inject(ClipboardService);

  protected readonly invoice = rxResource({ params: () => this.id(), stream: ({ params }) => this.bookingsApi.invoice(params) });
  protected readonly downloading = signal(false);

  protected back(): void {
    this.location.back();
  }

  protected print(): void {
    window.print();
  }

  protected downloadPdf(fileName: string): void {
    this.downloading.set(true);
    this.bookingsApi.invoicePdf(this.id()).subscribe({
      next: (blob) => {
        this.downloading.set(false);
        saveBlob(blob, `${fileName}.pdf`);
      },
      error: (err: unknown) => {
        this.downloading.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
