// import { Routes } from '@angular/router';

// export const routes: Routes = [];
// Trial
// export const routes = [
//   { path: '', redirectTo: 'chat', pathMatch: 'full' },
//   { path: 'chat', loadComponent: () => import('./components/chat-interface/chat.component') },
//   { path: 'admin', loadComponent: () => import('./components/admin-dashboard/admin-dashboard.component') },
//   { path: 'audit', loadComponent: () => import('./components/audit-logs/audit-logs.component') }
// ];
//Trial 2
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'chat', pathMatch: 'full' },

  {
    path: 'chat',
    loadComponent: () =>
      import('./components/chat-interface/chat-interface')
        .then(m => m.ChatInterface)
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./components/admin-dashboard/admin-dashboard')
        .then(m => m.AdminDashboard)
  },
  {
    path: 'audit',
    loadComponent: () =>
      import('./components/audit-logs/audit-logs')
        .then(m => m.AuditLogs)
  }
];
