import { Routes } from '@angular/router';
import { PORTAL_ROLES } from '@core/auth/roles';
import { roleGuard } from '@core/guards/auth.guard';

/** Supervisor field app — each page renders its own `<app-supervisor-shell>` (title/back vary per page). */
export const SUPERVISOR_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard(PORTAL_ROLES.supervisor)],
    children: [
      { path: '', title: 'field.titles.supervisorTasks', loadComponent: () => import('./pages/supervisor/tasks/supervisor-tasks.page').then((m) => m.SupervisorTasksPage) },
      { path: 'task/:id', title: 'field.titles.supervisorTask', loadComponent: () => import('./pages/supervisor/task/supervisor-task.page').then((m) => m.SupervisorTaskPage) },
      { path: 'locations', title: 'field.titles.supervisorLocations', loadComponent: () => import('./pages/supervisor/locations/supervisor-locations.page').then((m) => m.SupervisorLocationsPage) },
      { path: 'reports', title: 'field.titles.supervisorReports', loadComponent: () => import('./pages/supervisor/reports/supervisor-reports.page').then((m) => m.SupervisorReportsPage) },
      { path: 'me', title: 'field.titles.supervisorMe', loadComponent: () => import('./pages/supervisor/me/supervisor-me.page').then((m) => m.SupervisorMePage) },
    ],
  },
];
