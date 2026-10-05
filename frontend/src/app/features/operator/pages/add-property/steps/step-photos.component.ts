import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { CatalogService } from '@core/services/catalog.service';
import { ToastService } from '@core/services/toast.service';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { RadioCardOption, RadioCardsComponent } from '../../../components/radio-cards.component';
import { Mutation } from '../../../services/mutation';
import { uploadPhotos } from '../../../services/property-utils';
import { RequestShootDialogComponent } from '../../property-profile/tabs/request-shoot-dialog.component';
import { AddPropertyWizardService } from '../add-property-wizard.service';

type PhotoMode = 'photographer' | 'upload';

const PHOTO_OPTIONS: readonly RadioCardOption<PhotoMode>[] = [
  { value: 'upload', icon: 'upload', label: 'operator.add.photos.upload', hint: 'operator.add.photos.uploadHint' },
  { value: 'photographer', icon: 'camera', label: 'operator.add.photos.photographer', hint: 'operator.add.photos.photographerHint' },
];

/** Step 5 — upload the draft's photos, or book a professional shoot. */
@Component({
  selector: 'app-step-photos',
  imports: [TranslatePipe, IconComponent, RadioCardsComponent, RequestShootDialogComponent],
  template: `
    <h3 class="h3 mb-16">{{ 'operator.add.photos.title' | translate }}</h3>
    <app-radio-cards [options]="options" [selected]="mode()" (picked)="setMode($event)" />
    @if (mode() === 'upload') {
      <div class="photo-grid mt-16">
        @for (photo of wizard.photos(); track photo.id) {
          <div class="ph"><img [src]="photo.thumbUrl" alt="" /></div>
        }
        <label class="photo-add">
          @if (uploading.busy()) {
            <span class="spin dark"></span>
          } @else {
            <app-icon name="image-plus" size="lg" />
          }
          {{ 'operator.add.photos.add' | translate }}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple [disabled]="uploading.busy()" (change)="onFiles($event)" />
        </label>
      </div>
      @if (minPhotos(); as min) {
        <p class="xs muted mt-8">{{ 'operator.add.photos.minimum' | translate: { count: min } }}</p>
      }
    } @else if (wizard.property(); as p) {
      <div class="notice blue mt-16 small">
        <app-icon name="calendar" />
        <div class="grow">{{ 'operator.add.photos.schedule' | translate }}</div>
        <button type="button" class="btn btn-primary btn-xs" (click)="requestingShoot.set(true)">
          <app-icon name="camera" size="sm" />{{ 'operator.profile.content.requestPhotographer' | translate }}
        </button>
      </div>
      @if (wizard.shootRequested()) {
        <div class="notice green mt-8 small">
          <app-icon name="check-circle-2" />
          <div class="grow">{{ 'operator.add.photos.requested' | translate }}</div>
        </div>
      }
      @if (requestingShoot()) {
        <app-request-shoot-dialog [property]="p" (requested)="wizard.shootRequested.set(true)" (closed)="requestingShoot.set(false)" />
      }
    }
  `,
  styles: `
    .photo-grid {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepPhotosComponent {
  private readonly api = inject(HostPropertiesApi);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);
  protected readonly wizard = inject(AddPropertyWizardService);

  protected readonly options = PHOTO_OPTIONS;
  protected readonly mode = signal<PhotoMode>(this.wizard.shootRequested() ? 'photographer' : 'upload');
  protected readonly requestingShoot = signal(false);
  protected readonly uploading = new Mutation();
  protected readonly minPhotos = computed(() => this.catalog.settings()?.min_property_photos ?? 0);

  protected setMode(value: string): void {
    this.mode.set(value as PhotoMode);
  }

  protected onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    const draft = this.wizard.property();
    if (!files.length || !draft) return;
    this.uploading.run(uploadPhotos(this.api, draft.id, files), (uploaded) => {
      this.wizard.photos.update((photos) => [...photos, ...uploaded]);
      this.toast.success('operator.profile.content.uploaded', { count: files.length });
    });
  }
}
