import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { OpsPhoto, Task } from '@api/dto';
import { AdminPlatformApi } from '@api/endpoints/admin-platform.api';
import { ToastService } from '@core/services/toast.service';
import { AuthSrcDirective } from '@shared/directives/auth-src.directive';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

/** Rejection reasons offered on each photo (labels: `admin.photos.reasons.*`). */
export const PHOTO_REJECT_REASONS = ['low_light', 'tilted', 'low_resolution', 'personal_items', 'misleading'] as const;

interface PhotoDecision {
  approve: boolean;
  /** Reason key (`admin.photos.reasons.*`) when rejected. */
  reason?: string;
}

/** Photos still waiting for a decision (earlier rounds keep their verdict). */
const needsDecision = (p: OpsPhoto): boolean => !p.review || p.review === 'PENDING';

/**
 * QA of one submitted photo shoot: approve or reject every photo (with a reason), add a note for
 * the photographer and send the review in one call.
 */
@Component({
  selector: 'app-shoot-review-card',
  imports: [FormsModule, TranslatePipe, FORMAT_PIPES, AuthSrcDirective, FieldComponent, IconComponent],
  template: `
    @let t = shoot();
    <div class="card card-p">
      <div class="card-h">
        <div>
          <h3>{{ t.property.nameAr }}{{ t.unit ? ' • ' + t.unit.name : '' }}</h3>
          <div class="xs muted">
            {{ t.assignee?.fullName ?? ('admin.photos.unassigned' | translate) }} •
            {{ 'admin.photos.count' | translate: { count: t.photos.length } }}
            @if (t.completedAt) {
              • {{ 'admin.photos.submittedAt' | translate: { time: t.completedAt | appDate: 'dateTime' } }}
            }
          </div>
        </div>
        @if (pending().length) {
          <button type="button" class="btn btn-success btn-sm" [disabled]="busy()" (click)="approveAll()"><app-icon name="check-check" size="sm" />{{ 'admin.photos.approveAll' | translate }}</button>
        }
      </div>

      <div class="qa-grid">
        @for (p of t.photos; track p.id) {
          @let d = decisions()[p.id];
          @let verdict = d ? (d.approve ? 'approved' : 'rejected') : p.review === 'APPROVED' ? 'approved' : p.review === 'REJECTED' ? 'rejected' : '';
          <div class="qa-card" [class]="verdict">
            <button type="button" class="zoom-btn" [attr.aria-label]="'admin.photos.preview' | translate" (click)="zoom.emit(p.url)">
              <img [authSrc]="p.thumbUrl" alt="" />
            </button>
            <div class="card-p-sm">
              @if (isPending(p)) {
                <div class="row">
                  <button type="button" class="btn btn-xs grow" [class]="d?.approve ? 'btn-success' : 'btn-ghost'" [disabled]="busy()" (click)="decide(p, { approve: true })">
                    <app-icon name="check" size="sm" />{{ 'admin.photos.approve' | translate }}
                  </button>
                  <select
                    #reasonSelect
                    class="select reason"
                    [attr.aria-label]="'admin.photos.rejectReason' | translate"
                    [disabled]="busy()"
                    [value]="d && !d.approve ? d.reason : ''"
                    (change)="reject(p, reasonSelect.value)"
                  >
                    <option value="">{{ 'admin.photos.rejectBecause' | translate }}</option>
                    @for (r of reasons; track r) {
                      <option [value]="r">{{ 'admin.photos.reasons.' + r | translate }}</option>
                    }
                  </select>
                </div>
              } @else {
                <div class="xs b center" [class]="p.review === 'APPROVED' ? 'green' : 'red'">
                  {{ p.review === 'APPROVED' ? ('admin.photos.accepted' | translate) : p.reviewReason || ('admin.photos.rejected' | translate) }}
                </div>
              }
            </div>
          </div>
        }
      </div>

      <div class="grid g-2-1 mt-16 send">
        <app-field [label]="'admin.photos.note' | translate" [for]="'qa-note-' + t.id" [help]="'admin.photos.noteHelp' | translate">
          <textarea class="textarea" [id]="'qa-note-' + t.id" [(ngModel)]="note"></textarea>
        </app-field>
        <button type="button" class="btn btn-primary" [disabled]="busy() || !complete()" (click)="send()">
          <app-icon name="send" size="sm" />{{ 'admin.photos.send' | translate: { done: decidedCount(), total: pending().length } }}
        </button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .zoom-btn {
      display: block;
      width: 100%;
      padding: 0;
      border: 0;
      background: none;
      cursor: zoom-in;
    }
    .reason {
      height: 30px;
      font-size: 12px;
      flex: 1.4;
    }
    .send {
      align-items: end;
    }
    textarea {
      min-height: 64px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShootReviewCardComponent {
  private readonly api = inject(AdminPlatformApi);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly shoot = input.required<Task>();
  readonly reviewed = output<void>();
  /** Full-size photo URL to preview. */
  readonly zoom = output<string>();

  protected readonly reasons = PHOTO_REJECT_REASONS;
  protected readonly decisions = signal<Record<string, PhotoDecision>>({});
  protected readonly note = signal('');
  protected readonly busy = signal(false);

  protected readonly pending = computed(() => this.shoot().photos.filter(needsDecision));
  protected readonly decidedCount = computed(() => this.pending().filter((p) => this.decisions()[p.id]).length);
  protected readonly complete = computed(() => this.pending().length > 0 && this.decidedCount() === this.pending().length);

  protected isPending(photo: OpsPhoto): boolean {
    return needsDecision(photo);
  }

  protected decide(photo: OpsPhoto, decision: PhotoDecision): void {
    this.decisions.update((all) => ({ ...all, [photo.id]: decision }));
  }

  protected reject(photo: OpsPhoto, reason: string): void {
    if (reason) this.decide(photo, { approve: false, reason });
  }

  protected approveAll(): void {
    this.decisions.update((all) => ({ ...all, ...Object.fromEntries(this.pending().map((p) => [p.id, { approve: true }])) }));
  }

  protected send(): void {
    const all = this.decisions();
    // The reason is feedback delivered to the photographer, so it is sent as text in the reviewer's language.
    const decisions = this.pending().map((p) => {
      const d = all[p.id];
      return d.approve ? { photoId: p.id, approve: true } : { photoId: p.id, approve: false, reason: this.translate.instant(`admin.photos.reasons.${d.reason}`) };
    });
    const rejected = decisions.filter((d) => !d.approve).length;
    this.busy.set(true);
    this.api.reviewShoot(this.shoot().id, decisions, this.note().trim() || undefined).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(rejected ? 'admin.photos.sentRetake' : 'admin.photos.sentAccepted', { count: rejected });
        this.reviewed.emit();
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
