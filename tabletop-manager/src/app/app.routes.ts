import { Routes } from '@angular/router';
import { authGuard } from '../app/core/guards/auth';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('../app/features/auth/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('../app/features/auth/register/register').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard], // 🔒 Protected by auth guard
    loadComponent: () => import('../app/features/game-spaces/dashboard/dashboard').then(m => m.DashboardComponent)
  },
  // Admin Panel Routes
  {
    path: 'admin',
    canActivate: [authGuard], // 🔒 Protected by auth guard
    children: [
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full'
      },
      {
        path: 'overview',
        loadComponent: () => import('../app/features/game-spaces/admin-panel/admin-panel').then(m => m.AdminPanelComponent)
      },
      {
        path: 'content',
        loadComponent: () => import('../app/features/game-spaces/admin-panel/admin-panel').then(m => m.AdminPanelComponent)
      },
      {
        path: 'characters',
        loadComponent: () => import('../app/features/game-spaces/admin-panel/admin-panel').then(m => m.AdminPanelComponent)
      },
      {
        path: 'attributes',
        loadComponent: () => import('../app/features/game-spaces/admin-panel/admin-panel').then(m => m.AdminPanelComponent)
      },
      {
        path: 'trackers',
        loadComponent: () => import('../app/features/game-spaces/admin-panel/admin-panel').then(m => m.AdminPanelComponent)
      },
      {
        path: 'members',
        loadComponent: () => import('../app/features/game-spaces/admin-panel/admin-panel').then(m => m.AdminPanelComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('../app/features/game-spaces/admin-panel/admin-panel').then(m => m.AdminPanelComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];