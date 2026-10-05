import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MeApi } from '@api/endpoints/me.api';
import { AuthService } from '@core/services/auth.service';

/** Wallet balance of the signed-in guest, shared by the header chip, wallet tab and payment step. */
@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly meApi = inject(MeApi);
  private readonly auth = inject(AuthService);

  private readonly resource = rxResource({
    params: () => this.auth.user()?.id,
    stream: () => this.meApi.wallet(),
  });

  /** `null` until loaded (and for visitors). */
  readonly balance = computed(() => (this.resource.hasValue() ? this.resource.value().balance : null));
  readonly isLoading = this.resource.isLoading;
  readonly error = this.resource.error;

  reload(): void {
    this.resource.reload();
  }
}
