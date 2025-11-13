import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('🔒 adminGuard checking admin authentication for route:', state.url);

  if (authService.isAdminAuthenticated()) {
    console.log('✅ Admin access granted to route:', state.url);
    return true;
  } else {
    console.warn('🚫 Admin not logged in. Redirecting to /admin-login');
    router.navigate(['/admin-login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
};
