import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  console.log('🔒 authGuard checking for route:', state.url);

  const userId = localStorage.getItem('user_id');
  const token = localStorage.getItem('token');
  const hasUpdated = localStorage.getItem('hasUpdated') === 'true';

  if (!userId || !token) {
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
