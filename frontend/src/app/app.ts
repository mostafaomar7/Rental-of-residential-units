import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DemoSwitcherComponent } from '@layouts/demo-switcher/demo-switcher.component';
import { ToastHostComponent } from '@shared/ui/toast-host/toast-host.component';
import { ConfirmHostComponent } from '@shared/ui/confirm-host/confirm-host.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DemoSwitcherComponent, ToastHostComponent, ConfirmHostComponent],
  template: `
    <router-outlet />
    <app-demo-switcher />
    <app-confirm-host />
    <app-toast-host />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
