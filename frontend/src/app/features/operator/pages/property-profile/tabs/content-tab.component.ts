import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { switchMap } from 'rxjs';
import { ManagedPhoto, ManagedProperty } from '@api/dto';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { CatalogService } from '@core/services/catalog.service';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { Mutation } from '../../../services/mutation';
import { sortedPhotos, uploadPhotos } from '../../../services/property-utils';
import { RequestShootDialogComponent } from './request-shoot-dialog.component';
import { SaveBarComponent } from './save-bar.component';

interface ContentForm {
  amenityIds: string[];
  descriptionAr: string;
  descriptionEn: string;
  guideAr: string;
}

function toForm(p: ManagedProperty): ContentForm {
  return {
    amenityIds: p.content.amenities.map((a) => a.id),
    descriptionAr: p.content.descriptionAr ?? '',
    descriptionEn: p.content.descriptionEn ?? '',
    guideAr: p.content.guideAr ?? '',
  };
}

/** Content layer: photos (upload, order, cover, delete, professional shoot), amenities and descriptions. */
@Component({
  selector: 'app-content-tab',
  imports: [TranslatePipe, LocalizePipe, FieldComponent, IconComponent, SaveBarComponent, RequestShootDialogComponent],
  templateUrl: './content-tab.component.html',
  styles: `
    .photo-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    }
    .upload-btn {
      cursor: pointer;
    }
    .upload-btn input {
      display: none;
    }
    .ph-del {
      position: absolute;
      top: 6px;
      inset-inline-end: 6px;
    }
    .ph-tools {
      position: absolute;
      bottom: 6px;
      inset-inline-start: 6px;
      inset-inline-end: 6px;
      gap: 4px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentTabComponent {
  private readonly api = inject(HostPropertiesApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly catalog = inject(CatalogService);

  readonly property = input.required<ManagedProperty>();
  readonly saved = output<ManagedProperty>();

  protected readonly saving = new Mutation();
  protected readonly photoAction = new Mutation();
  protected readonly requestingShoot = signal(false);
  protected readonly form = linkedSignal(() => toForm(this.property()));
  protected readonly photos = computed(() => sortedPhotos(this.property().content.photos));
  protected readonly minPhotos = computed(() => this.catalog.settings()?.min_property_photos ?? 0);

  protected set<K extends keyof ContentForm>(key: K, value: ContentForm[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected toggleAmenity(id: string): void {
    const ids = this.form().amenityIds;
    this.set('amenityIds', ids.includes(id) ? ids.filter((a) => a !== id) : [...ids, id]);
  }

  // ---- photos ----

  protected onPhotos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;
    this.photoAction.run(uploadPhotos(this.api, this.property().id, files), (uploaded) => {
      this.toast.success('operator.profile.content.uploaded', { count: files.length });
      this.emitPhotos([...this.property().content.photos, ...uploaded]);
    });
  }

  /** Moves a photo one place earlier (`-1`) or later (`+1`). */
  protected move(index: number, step: -1 | 1): void {
    const ids = this.photos().map((p) => p.id);
    const target = index + step;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    this.photoAction.run(this.api.reorderPhotos(this.property().id, ids), (photos) => this.emitPhotos(photos));
  }

  protected setCover(photo: ManagedPhoto): void {
    this.photoAction.run(this.api.updatePhoto(photo.id, { isCover: true }), (cover) => {
      this.toast.success('operator.profile.content.coverSet');
      this.emitPhotos(this.property().content.photos.map((p) => (p.id === cover.id ? cover : { ...p, isCover: false })));
    });
  }

  protected async removePhoto(photo: ManagedPhoto): Promise<void> {
    const ok = await this.confirm.ask({ message: 'operator.profile.content.deleteConfirm', okLabel: 'operator.profile.content.deletePhoto', danger: true });
    if (!ok) return;
    this.photoAction.run(this.api.deletePhoto(photo.id), () => {
      this.toast.show('operator.profile.content.photoDeleted');
      this.emitPhotos(this.property().content.photos.filter((p) => p.id !== photo.id));
    });
  }

  private emitPhotos(photos: ManagedPhoto[]): void {
    const p = this.property();
    this.saved.emit({ ...p, content: { ...p.content, photos } });
  }

  // ---- amenities & descriptions ----

  protected save(): void {
    const id = this.property().id;
    const f = this.form();
    const request = this.api.setAmenities(id, f.amenityIds).pipe(
      switchMap(() =>
        this.api.update(id, {
          descriptionAr: f.descriptionAr.trim() || null,
          descriptionEn: f.descriptionEn.trim() || null,
          guideAr: f.guideAr.trim() || null,
        }),
      ),
    );
    this.saving.run(request, (p) => {
      this.toast.success('operator.profile.content.saved');
      this.saved.emit(p);
    });
  }

  protected revert(): void {
    this.form.set(toForm(this.property()));
    this.toast.show('operator.profile.reverted');
  }
}
