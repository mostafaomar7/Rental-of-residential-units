import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiError } from '@api/api-error';
import { ManualIdentityBody } from '@api/dto';
import { MeApi } from '@api/endpoints/me.api';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { today } from '@core/utils/date.utils';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { KvComponent } from '@shared/ui/kv/kv.component';
import { LoadStateComponent } from '../../../components/load-state/load-state.component';
import { NafathDialogComponent } from '../../../components/nafath-dialog/nafath-dialog.component';

type ManualType = ManualIdentityBody['type'];
const MANUAL_TYPES: readonly ManualType[] = ['PASSPORT', 'GCC_ID'];

const EMPTY_FORM: ManualIdentityBody = { type: 'PASSPORT', number: '', nationality: '', dateOfBirth: '', fullNameEn: '' };

/**
 * Identity on file (SRS USR-05, SHOMOOS): citizens and residents verify with Nafath; visitors
 * enter a passport or GCC ID manually. Required before the digital key is issued.
 */
@Component({
  selector: 'app-identity-tab',
  imports: [TranslatePipe, AppDatePipe, FieldComponent, IconComponent, KvComponent, LoadStateComponent, NafathDialogComponent],
  template: `
    <h2 class="h2 mb-16">{{ 'account.nav.identity' | translate }}</h2>
    @if (identity.hasValue()) {
      @let id = identity.value();
      <div class="stack">
        @if (id) {
          <div class="card card-p">
            <div class="row between mb-8">
              <h3 class="h3">{{ 'account.identity.onFile' | translate }}</h3>
              @if (id.verified) {
                <span class="pill pill-green"><app-icon name="badge-check" />{{ 'account.identity.verified' | translate }}</span>
              } @else {
                <span class="pill pill-amber">{{ 'account.identity.unverified' | translate }}</span>
              }
            </div>
            <app-kv [label]="'account.identity.type' | translate">{{ 'domain.api.identityType.' + id.type | translate }}</app-kv>
            <app-kv [label]="'account.identity.number' | translate"><span class="ltr">{{ id.numberMasked }}</span></app-kv>
            @if (id.fullNameAr || id.fullNameEn) {
              <app-kv [label]="'account.identity.name' | translate">{{ id.fullNameAr || id.fullNameEn }}</app-kv>
            }
            <app-kv [label]="'account.identity.nationality' | translate">{{ id.nationality }}</app-kv>
            <app-kv [label]="'account.identity.dateOfBirth' | translate">{{ id.dateOfBirth | appDate: 'medium' }}</app-kv>
            <app-kv [label]="'account.identity.source' | translate">{{ 'account.identity.sources.' + id.source | translate }}</app-kv>
            @if (id.verifiedAt) {
              <app-kv [label]="'account.identity.verifiedAt' | translate">{{ id.verifiedAt | appDate: 'dateTime' }}</app-kv>
            }
          </div>
        }

        @if (!id || id.source !== 'NAFATH') {
          <div class="card card-p row between wrap">
            <div class="row">
              <span class="pm-logo nafath-logo">{{ 'account.nafath.logo' | translate }}</span>
              <div>
                <div class="b">{{ 'account.identity.nafathTitle' | translate }}</div>
                <div class="xs muted">{{ 'account.identity.nafathHint' | translate }}</div>
              </div>
            </div>
            <button type="button" class="btn btn-primary" (click)="verifying.set(true)">
              <app-icon name="fingerprint-pattern" size="sm" />{{ 'account.booking.guest.verifyButton' | translate }}
            </button>
          </div>

          <div class="card card-p">
            <h3 class="h3">{{ 'account.identity.manualTitle' | translate }}</h3>
            <p class="small muted mt-4">{{ 'account.identity.manualHint' | translate }}</p>
            <form class="grid g2 mt-16" (submit)="$event.preventDefault(); saveManual()">
              <app-field [label]="'account.identity.type' | translate" for="id-type">
                <select id="id-type" class="select" (change)="edit({ type: $any($event.target).value })">
                  @for (t of manualTypes; track t) {
                    <option [value]="t" [selected]="t === form().type">{{ 'domain.api.identityType.' + t | translate }}</option>
                  }
                </select>
              </app-field>
              <app-field [label]="'account.identity.number' | translate" for="id-num" [error]="fieldError('number') | translate">
                <input id="id-num" class="input ltr" autocomplete="off" [value]="form().number" (input)="edit({ number: $any($event.target).value.trim() })" />
              </app-field>
              <app-field [label]="'account.identity.nationality' | translate" for="id-nat" [help]="'account.identity.nationalityHelp' | translate" [error]="fieldError('nationality') | translate">
                <input id="id-nat" class="input ltr" maxlength="3" [value]="form().nationality" (input)="edit({ nationality: $any($event.target).value.trim().toUpperCase() })" />
              </app-field>
              <app-field [label]="'account.identity.dateOfBirth' | translate" for="id-dob" [error]="fieldError('dateOfBirth') | translate">
                <input id="id-dob" type="date" class="input" [max]="maxBirthDate" [value]="form().dateOfBirth" (change)="edit({ dateOfBirth: $any($event.target).value })" />
              </app-field>
              <app-field [label]="'account.identity.nameEn' | translate" for="id-name" [error]="fieldError('fullNameEn') | translate">
                <input id="id-name" class="input ltr" autocomplete="name" [value]="form().fullNameEn" (input)="edit({ fullNameEn: $any($event.target).value })" />
              </app-field>
            </form>
            <button type="button" class="btn btn-primary mt-16" [disabled]="busy()" (click)="saveManual()">{{ 'account.identity.save' | translate }}</button>
          </div>
        }
      </div>
    } @else {
      <div class="card">
        <app-load-state [error]="identity.error()" (retry)="identity.reload()" />
      </div>
    }

    @if (verifying()) {
      <app-nafath-dialog (verified)="onVerified()" (closed)="verifying.set(false)" />
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .nafath-logo {
      background: #0f8a5f;
      color: #fff;
      width: 52px;
      height: 40px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdentityTabComponent {
  private readonly meApi = inject(MeApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly manualTypes = MANUAL_TYPES;
  protected readonly maxBirthDate = today();

  protected readonly identity = rxResource({ stream: () => this.meApi.identity() });
  protected readonly verifying = signal(false);
  protected readonly busy = signal(false);
  protected readonly form = signal<ManualIdentityBody>({ ...EMPTY_FORM });
  /** Fields the API rejected (`VALIDATION_ERROR`). */
  private readonly invalidFields = signal<string[]>([]);

  protected edit(patch: Partial<ManualIdentityBody>): void {
    this.form.update((f) => ({ ...f, ...patch }));
  }

  /** Translation key of a field's error, or `''`. */
  protected fieldError(field: string): string {
    return this.invalidFields().includes(field) ? 'account.identity.invalidField' : '';
  }

  protected onVerified(): void {
    this.verifying.set(false);
    this.toast.success('account.nafath.done');
    this.identity.reload();
  }

  protected saveManual(): void {
    const f = this.form();
    if (!f.number || !f.nationality || !f.dateOfBirth) {
      this.toast.error('account.identity.incomplete');
      return;
    }
    this.busy.set(true);
    this.invalidFields.set([]);
    this.meApi.saveManualIdentity({ ...f, fullNameEn: f.fullNameEn?.trim() || undefined }).subscribe({
      next: (identity) => {
        this.busy.set(false);
        this.identity.set(identity);
        this.form.set({ ...EMPTY_FORM });
        this.toast.success('account.identity.saved');
        this.meApi.profile().subscribe({ next: (user) => this.auth.setUser(user), error: () => undefined });
      },
      error: (err: unknown) => {
        this.busy.set(false);
        const fields = ApiError.from(err).fieldErrors.map((e) => e.field);
        this.invalidFields.set(fields);
        if (!fields.length) this.toast.apiError(err);
      },
    });
  }
}
