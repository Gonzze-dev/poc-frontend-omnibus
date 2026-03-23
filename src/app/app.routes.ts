import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/ticket-search/ticket-search').then((m) => m.TicketSearch),
  },
];
