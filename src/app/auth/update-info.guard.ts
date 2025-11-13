import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const updateInfoGuard: CanActivateFn = () => {
  const router = inject(Router);
  const loggedIn = localStorage.getItem('loggedIn') === 'true';
  const hasUpdated = localStorage.getItem('hasUpdated') === 'true';

  // ✅ If not logged in → redirect to login
  if (!loggedIn) {
    router.navigate(['/login']);
    return false;
  }

  // ✅ If already updated → block access and redirect to landing
  if (hasUpdated) {
    router.navigate(['/landing']);
    return false;
  }

  // ✅ Otherwise, allow access
  return true;
};
