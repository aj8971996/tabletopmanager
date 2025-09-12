import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth';

// Functional guard (Angular 15+ style) - simpler approach
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  console.log('AuthGuard: Checking authentication for route:', state.url);
  
  // Check if still loading
  if (authService.isLoading()) {
    console.log('AuthGuard: Still loading, denying access');
    router.navigate(['/login']);
    return false;
  }
  
  // Check if user is authenticated
  const user = authService.currentUser();
  
  if (user) {
    console.log('AuthGuard: User authenticated:', user.email);
    return true;
  }
  
  console.log('AuthGuard: Not authenticated, redirecting to login');
  router.navigate(['/login']);
  return false;
};