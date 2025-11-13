// auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('🔒 authGuard checking authentication for route:', state.url);

  const isAuthenticated = authService.isAuthenticated();
  const hasUpdated = localStorage.getItem('hasUpdated') === 'true';

  if (!isAuthenticated) {
    console.warn('🚫 User not logged in. Redirecting to /login');
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // 🚫 Block access to /update-info if user already updated
  if (state.url.includes('/update-info') && hasUpdated) {
    console.warn('⚠️ User already updated info. Redirecting to /landing');
    router.navigate(['/landing']);
    return false;
  }

  console.log('✅ Access granted to route:', state.url);
  return true;
};
