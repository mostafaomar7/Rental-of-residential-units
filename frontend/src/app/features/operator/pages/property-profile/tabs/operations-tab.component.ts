import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ManagedProperty, OperatingModel, Person } from '@api/dto';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoadErrorComponent, LoadingComponent } from '../../../components/async-state.component';
import { UnitLockCardComponent } from '../../../components/locks/unit-lock-card.component';
import { RadioCardOption, RadioCardsComponent } from '../../../components/radio-cards.component';
import { Mutation } from '../../../services/mutation';
import { OperatorSessionService } from '../../../services/operator-session.service';

export const OPERATING_MODEL_OPTIONS: readonly RadioCardOption<OperatingModel>[] = [
  { value: 'SUPERVISED', icon: 'user-check', label: 'domain.api.operatingModel.SUPERVISED', hint: 'operator.profile.ops.supervisedHint', tone: 'navy' },
  { value: 'SELF_SERVICE', icon: 'smartphone', label: 'domain.api.operatingModel.SELF_SERVICE', hint: 'operator.profile.ops.selfHint', tone: 'gold' },
];

/** Operations layer: operating model, operators (owner only), field supervisors and smart locks per unit. */
@Component({
  selector: 'app-operations-tab',
  imports: [TranslatePipe, EmptyStateComponent, IconComponent, LoadingComponent, LoadErrorComponent, RadioCardsComponent, UnitLockCardComponent],
  templateUrl: './operations-tab.component.html',
  styles: `
    .mobile-input {
      max-width: 220px;
    }
    .person {
      padding: 8px 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationsTabComponent {
  private readonly api = inject(HostPropertiesApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly translate = inject(TranslateService);
  protected readonly session = inject(OperatorSessionService);

  readonly property = input.required<ManagedProperty>();
  readonly saved = output<ManagedProperty>();

  protected readonly modelOptions = OPERATING_MODEL_OPTIONS;
  protected readonly saving = new Mutation();
  protected readonly peopleAction = new Mutation();
  protected readonly operatorMobile = signal('');

  protected readonly supervisors = rxResource({
    params: () => this.property().id,
    stream: ({ params }) => this.api.supervisors(params),
  });

  protected setModel(value: string): void {
    const model = value as OperatingModel;
    if (model === this.property().operations.operatingModel) return;
    this.saving.run(this.api.update(this.property().id, { operatingModel: model }), (p) => {
      this.toast.success('operator.profile.ops.modelChanged', { model: this.translate.instant('domain.api.operatingModel.' + model) });
      this.saved.emit(p);
    });
  }

  protected addOperator(): void {
    const mobile = this.operatorMobile().trim();
    if (!mobile) return;
    this.peopleAction.run(this.api.addOperator(this.property().id, mobile), (p) => {
      this.operatorMobile.set('');
      this.toast.success('operator.profile.ops.operatorAdded');
      this.saved.emit(p);
    });
  }

  protected async removeOperator(person: Person): Promise<void> {
    if (!(await this.confirmRemoval(person))) return;
    const p = this.property();
    this.peopleAction.run(this.api.removeOperator(p.id, person.id), () => {
      this.toast.show('operator.profile.ops.personRemoved', 'info', { name: person.fullName });
      this.saved.emit({ ...p, operations: { ...p.operations, operators: p.operations.operators.filter((o) => o.id !== person.id) } });
    });
  }

  protected async removeSupervisor(person: Person): Promise<void> {
    if (!(await this.confirmRemoval(person))) return;
    this.peopleAction.run(this.api.removeSupervisor(this.property().id, person.id), () => {
      this.toast.show('operator.profile.ops.personRemoved', 'info', { name: person.fullName });
      this.supervisors.update((list) => list?.filter((s) => s.id !== person.id));
    });
  }

  private confirmRemoval(person: Person): Promise<boolean> {
    return this.confirm.ask({
      title: 'operator.profile.ops.removeTitle',
      message: 'operator.profile.ops.removeMessage',
      messageParams: { name: person.fullName },
      okLabel: 'operator.profile.ops.remove',
      danger: true,
    });
  }
}
