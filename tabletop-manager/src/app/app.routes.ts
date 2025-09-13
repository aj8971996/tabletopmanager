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
    canActivate: [authGuard],
    loadComponent: () => import('../app/features/game-spaces/dashboard/dashboard').then(m => m.DashboardComponent)
  },
  // Admin Panel Routes with proper child routing
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('../app/features/game-spaces/admin-panel/admin-panel').then(m => m.AdminPanelComponent),
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
        path: 'attributes',
        loadComponent: () => import('../app/features/game-spaces/attribute-manager/attribute-manager').then(m => m.AttributeManagerComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];