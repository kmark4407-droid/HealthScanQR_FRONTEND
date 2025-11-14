import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const updateInfoGuard: CanActivateFn = () => {
  const router = inject(Router);
  
  // ✅ FIXED: Check for actual login indicators (user_id or token)
  const userId = localStorage.getItem('user_id');
  const token = localStorage.getItem('token');
  const hasUpdated = localStorage.getItem('hasUpdated') === 'true';

  console.log('🛡️ Guard Check:', { 
    userId, 
    token, 
    hasUpdated,
    allStorage: { ...localStorage }
  });

  // ✅ If not logged in → redirect to login
  if (!userId || !token) {
    console.log('❌ Guard: Not logged in, redirecting to login');
    router.navigate(['/login']);
    return false;
  }

  // ✅ If already updated → block access and redirect to landing
  if (hasUpdated) {
    console.log('✅ Guard: Already updated, redirecting to landing');
    router.navigate(['/landing']);
    return false;
  }

  // ✅ Otherwise, allow access to update page
  console.log('✅ Guard: Allowing access to update page');
  return true;
};
