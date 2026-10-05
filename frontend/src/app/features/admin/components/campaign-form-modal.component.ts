import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Campaign, CampaignBody, CampaignStatus } from '@api/dto';
import { ToastService } from '@core/services/toast.service';
import { addDays, today } from '@core/utils/date.utils';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';

/** Paid channels offered for a campaign (labels: `admin.campaigns.channels.*`). */
export const CAMPAIGN_CHANNELS = ['Snapchat', 'Google Ads', 'Instagram', 'TikTok', 'X', 'WhatsApp', 'Email'] as const;
/** Statuses a new campaign can start in. */
const START_STATUSES: readonly CampaignStatus[] = ['DRAFT', 'ACTIVE'];
/** `utm_campaign` values: lower-case letters, digits, `-` and `_`. */
const UTM_PATTERN = /^[a-z0-9_-]+$/;

const DEFAULT_DURATION_DAYS = 21;

/** Creates a platform campaign or edits one (pass `campaign`). */
@Component({
  selector: 'app-campaign-form-modal',
  imports: [FormsModule, TranslatePipe, ModalComponent, FieldComponent],
  template: `
    <app-modal size="lg" [title]="(isEdit() ? 'admin.campaigns.editTitle' : 'admin.campaigns.newTitle') | translate" (closed)="closed.emit()">
      <div class="grid g2">
        <app-field [label]="'admin.campaigns.form.name' | translate" for="cn-name">
          <input id="cn-name" class="input" [placeholder]="'admin.campaigns.form.namePlaceholder' | translate" [(ngModel)]="name" />
        </app-field>
        <app-field [label]="'admin.campaigns.form.channel' | translate" for="cn-channel">
          <select id="cn-channel" class="select" [(ngModel)]="channel">
            @for (c of channels(); track c) {
              <option [value]="c">{{ channelKey(c) | translate }}</option>
            }
          </select>
        </app-field>
        <app-field [label]="'admin.campaigns.form.utm' | translate" for="cn-utm" [help]="'admin.campaigns.form.utmHelp' | translate">
          <input id="cn-utm" class="input ltr" [(ngModel)]="utm" />
        </app-field>
        <app-field [label]="'admin.campaigns.form.goal' | translate" for="cn-goal">
          <input id="cn-goal" class="input" [(ngModel)]="goal" />
        </app-field>
        <app-field [label]="'admin.campaigns.form.budget' | translate" for="cn-budget">
          <input id="cn-budget" class="input" type="number" min="0" [(ngModel)]="budget" />
        </app-field>
        @if (isEdit()) {
          <app-field [label]="'admin.campaigns.form.spend' | translate" for="cn-spend" [help]="'admin.campaigns.form.spendHelp' | translate">
            <input id="cn-spend" class="input" type="number" min="0" [(ngModel)]="spend" />
          </app-field>
        } @else {
          <app-field [label]="'admin.campaigns.form.status' | translate" for="cn-status">
            <select id="cn-status" class="select" [(ngModel)]="status">
              @for (s of startStatuses; track s) {
                <option [value]="s">{{ 'status.campaign.' + s | translate }}</option>
              }
            </select>
          </app-field>
        }
        <app-field [label]="'admin.campaigns.form.from' | translate" for="cn-from">
          <input id="cn-from" class="input" type="date" [(ngModel)]="from" />
        </app-field>
        <app-field [label]="'admin.campaigns.form.to' | translate" for="cn-to">
          <input id="cn-to" class="input" type="date" [(ngModel)]="to" />
        </app-field>
      </div>
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="submit()">{{ (isEdit() ? 'common.save' : 'admin.campaigns.form.create') | translate }}</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignFormModalComponent implements OnInit {
  private readonly toast = inject(ToastService);

  /** Campaign being edited; omit to create one. Read once when the dialog opens. */
  readonly campaign = input<Campaign | null>(null);
  readonly busy = input(false);
  readonly saved = output<CampaignBody>();
  readonly closed = output<void>();

  protected readonly startStatuses = START_STATUSES;
  protected readonly isEdit = computed(() => !!this.campaign());

  protected readonly name = signal('');
  protected readonly channel = signal<string>(CAMPAIGN_CHANNELS[0]);
  protected readonly utm = signal('');
  protected readonly goal = signal('');
  protected readonly budget = signal<number>(0);
  protected readonly spend = signal<number>(0);
  protected readonly status = signal<CampaignStatus>('DRAFT');
  protected readonly from = signal(today());
  protected readonly to = signal(addDays(today(), DEFAULT_DURATION_DAYS));

  /** Known channels, plus the campaign's own when it is not one of them. */
  protected readonly channels = computed<string[]>(() => {
    const own = this.campaign()?.channel;
    const known: string[] = [...CAMPAIGN_CHANNELS];
    return own && !known.includes(own) ? [...known, own] : known;
  });

  ngOnInit(): void {
    const c = this.campaign();
    if (!c) return;
    this.name.set(c.name);
    this.channel.set(c.channel);
    this.utm.set(c.utmCampaign);
    this.goal.set(c.goal ?? '');
    this.budget.set(c.budget);
    this.spend.set(c.spend);
    this.from.set(c.startsOn);
    this.to.set(c.endsOn);
  }

  protected channelKey(channel: string): string {
    return (CAMPAIGN_CHANNELS as readonly string[]).includes(channel) ? `admin.campaigns.channels.${channel}` : channel;
  }

  protected submit(): void {
    const name = this.name().trim();
    const utmCampaign = this.utm().trim();
    const budget = Number(this.budget());
    const spend = Number(this.spend());
    if (!name) return this.toast.error('admin.campaigns.form.nameRequired');
    if (!UTM_PATTERN.test(utmCampaign)) return this.toast.error('admin.campaigns.form.utmInvalid');
    if (!(budget >= 0) || !(spend >= 0)) return this.toast.error('admin.campaigns.form.amountInvalid');
    if (!this.from() || !this.to() || this.to() < this.from()) return this.toast.error('admin.campaigns.form.datesInvalid');

    const body: CampaignBody = { name, channel: this.channel(), utmCampaign, goal: this.goal().trim() || null, budget, startsOn: this.from(), endsOn: this.to() };
    this.saved.emit(this.isEdit() ? { ...body, spend } : { ...body, status: this.status() });
  }
}
