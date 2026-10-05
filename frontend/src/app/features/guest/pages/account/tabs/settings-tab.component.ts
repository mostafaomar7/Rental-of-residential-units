import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Lang } from '@api/api.types';
import { NotificationPreferences } from '@api/dto';
import { MeApi } from '@api/endpoints/me.api';
import { AuthService } from '@core/services/auth.service';
import { LangService, SUPPORTED_LANGS } from '@core/services/lang.service';
import { ToastService } from '@core/services/toast.service';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ToggleComponent } from '@shared/ui/toggle/toggle.component';
import { LoadStateComponent } from '../../../components/load-state/load-state.component';
import { DeleteAccountDialogComponent } from '../components/delete-account-dialog.component';
import { MobileChangeDialogComponent } from '../components/mobile-change-dialog.component';

type Channel = keyof Pick<NotificationPreferences, 'sms' | 'whatsapp' | 'email'>;
const CHANNELS: readonly Channel[] = ['sms', 'whatsapp', 'email'];
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ProfileForm {
  fullName: string;
  email: string;
}

/** Profile, language, notification channels, password, mobile number and account deletion. */
@Component({
  selector: 'app-settings-tab',
  imports: [TranslatePipe, FieldComponent, IconComponent, ToggleComponent, LoadStateComponent, DeleteAccountDialogComponent, MobileChangeDialogComponent],
  templateUrl: './settings-tab.component.html',
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsTabComponent {
  private readonly meApi = inject(MeApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly lang = inject(LangService);

  protected readonly user = this.auth.user;
  protected readonly languages = SUPPORTED_LANGS;
  protected readonly channels = CHANNELS;
  protected readonly minPassword = MIN_PASSWORD_LENGTH;

  protected readonly dialog = signal<'delete' | 'mobile' | null>(null);
  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly savingChannel = signal<Channel | null>(null);

  private readonly savedProfile = computed<ProfileForm>(
    () => {
      const u = this.user();
      return { fullName: u?.fullName ?? '', email: u?.email ?? '' };
    },
    { equal: (a, b) => a.fullName === b.fullName && a.email === b.email },
  );
  /** Editable copy of the profile, reset only when the saved profile itself changes. */
  protected readonly form = linkedSignal(() => this.savedProfile());

  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');

  protected readonly preferences = rxResource({ stream: () => this.meApi.notificationPreferences() });

  protected edit(field: keyof ProfileForm, value: string): void {
    this.form.update((f) => ({ ...f, [field]: value }));
  }

  protected saveProfile(): void {
    const fullName = this.form().fullName.trim();
    const email = this.form().email.trim();
    if (!fullName) {
      this.toast.error('account.errors.nameRequired');
      return;
    }
    if (email && !EMAIL_PATTERN.test(email)) {
      this.toast.error('account.errors.emailInvalid');
      return;
    }
    this.savingProfile.set(true);
    this.meApi.updateProfile({ fullName, ...(email ? { email } : {}) }).subscribe({
      next: (user) => {
        this.savingProfile.set(false);
        this.auth.setUser(user);
        this.toast.success('account.settings.saved');
      },
      error: (err: unknown) => {
        this.savingProfile.set(false);
        this.toast.apiError(err);
      },
    });
  }

  /** Switches the UI at once and stores the choice on the account (used for SMS / WhatsApp messages). */
  protected setLanguage(language: Lang): void {
    this.lang.use(language);
    this.meApi.updateProfile({ language }).subscribe({
      next: (user) => this.auth.setUser(user),
      error: (err: unknown) => this.toast.apiError(err),
    });
  }

  protected setChannel(channel: Channel, enabled: boolean): void {
    this.savingChannel.set(channel);
    this.meApi.updateNotificationPreferences({ [channel]: enabled }).subscribe({
      next: (prefs) => {
        this.savingChannel.set(null);
        this.preferences.set(prefs);
        this.toast.success(enabled ? 'account.settings.enabled' : 'account.settings.disabled');
      },
      error: (err: unknown) => {
        this.savingChannel.set(null);
        this.preferences.reload();
        this.toast.apiError(err);
      },
    });
  }

  protected savePassword(): void {
    const hasPassword = !!this.user()?.hasPassword;
    if (hasPassword && !this.currentPassword()) {
      this.toast.error('account.password.currentRequired');
      return;
    }
    if (this.newPassword().length < MIN_PASSWORD_LENGTH) {
      this.toast.error('account.password.tooShort', { min: MIN_PASSWORD_LENGTH });
      return;
    }
    this.savingPassword.set(true);
    this.meApi.setPassword(this.newPassword(), hasPassword ? this.currentPassword() : undefined).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.currentPassword.set('');
        this.newPassword.set('');
        this.toast.success('account.password.saved');
        this.meApi.profile().subscribe({ next: (user) => this.auth.setUser(user), error: () => undefined });
      },
      error: (err: unknown) => {
        this.savingPassword.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
