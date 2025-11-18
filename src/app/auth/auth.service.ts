// auth.service.ts - COMPLETELY REVISED WITH CORRECT ENDPOINTS
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../Environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ✅ REGISTER - CORRECT ENDPOINT
  register(data: any): Observable<any> {
    console.log('📝 Registering user:', data.email);
    
    return this.http.post(`${this.apiUrl}/api/auth/register`, data).pipe(
      tap((response: any) => {
        console.log('✅ Registration response:', response);
        
        if (response.success) {
          localStorage.setItem('pending_user_email', data.email);
          localStorage.setItem('pending_user_data', JSON.stringify({
            email: data.email,
            full_name: data.full_name,
            username: data.username
          }));
          
          if (response.emailSent) {
            console.log('📧 Verification email sent - check your inbox');
          } else {
            console.log('⚠️ Registration complete but email failed - use resend');
          }
        }
      }),
      catchError((error: any) => {
        console.error('❌ Registration error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ LOGIN - CORRECT ENDPOINT
  login(data: any): Observable<any> {
    console.log('🔐 Logging in user:', data.email);
    
    return this.http.post(`${this.apiUrl}/api/auth/login`, data).pipe(
      tap((response: any) => {
        console.log('✅ Login response:', response);
        
        if (response.success && response.token && response.user) {
          this.saveUserData(response.token, response.user);
          console.log('✅ User logged in successfully');
        }
      }),
      catchError((error: any) => {
        console.error('❌ Login error:', error);
        
        if (error.error?.requiresVerification) {
          localStorage.setItem('pending_verification_email', data.email);
        }
        
        return throwError(() => error);
      })
    );
  }

  // ✅ RESEND VERIFICATION - CORRECT ENDPOINT
  resendVerificationEmail(email: string): Observable<any> {
    console.log('📧 Resending verification to:', email);
    
    return this.http.post(`${this.apiUrl}/api/auth/resend-verification`, { email }).pipe(
      tap((response: any) => {
        console.log('✅ Resend response:', response);
        if (response.success && response.emailSent) {
          console.log('✅ Verification email sent successfully');
        }
      }),
      catchError((error: any) => {
        console.error('❌ Resend error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ CHECK SYNC VERIFICATION - CORRECT ENDPOINT
  checkSyncVerification(email: string, password: string): Observable<any> {
    console.log('🔄 Checking sync verification for:', email);
    
    return this.http.post(`${this.apiUrl}/api/auth/check-sync-verification`, { 
      email: email,
      password: password
    }).pipe(
      tap((response: any) => {
        console.log('✅ Check sync response:', response);
        if (response.success && response.emailVerified) {
          this.clearPendingVerification();
          console.log('✅ Email verified and synced');
        }
      }),
      catchError((error: any) => {
        console.error('❌ Check sync error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ MANUAL SYNC VERIFICATION - USING CORRECT ENDPOINT
  manualSyncVerification(email: string): Observable<any> {
    console.log('🔧 Manual sync for:', email);
    
    return this.http.post(`${this.apiUrl}/api/manual-sync-verification`, { 
      email: email,
      password: 'temporary-password' 
    }).pipe(
      tap((response: any) => {
        console.log('✅ Manual sync response:', response);
        if (response.success) {
          this.clearPendingVerification();
          console.log('✅ Email verified via manual sync');
        }
      }),
      catchError((error: any) => {
        console.error('❌ Manual sync error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ QUICK VERIFY - CORRECT ENDPOINT
  quickVerifyEmail(email: string): Observable<any> {
    console.log('⚡ Quick verifying:', email);
    
    return this.http.post(`${this.apiUrl}/api/quick-verify`, { email }).pipe(
      tap((response: any) => {
        console.log('✅ Quick verify response:', response);
        if (response.success) {
          this.clearPendingVerification();
          console.log('✅ Email verified instantly');
        }
      }),
      catchError((error: any) => {
        console.error('❌ Quick verify error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ CHECK VERIFICATION STATUS - CORRECT ENDPOINT
  checkVerificationStatus(email: string): Observable<any> {
    console.log('🔍 Checking verification status for:', email);
    
    return this.http.get(`${this.apiUrl}/api/auth/verification-status/${email}`).pipe(
      tap((response: any) => {
        console.log('✅ Verification status:', response);
      }),
      catchError((error: any) => {
        console.error('❌ Status check error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ GET USER PROFILE - NOTE: This endpoint might not exist in your backend
  getProfile(): Observable<any> {
    const token = this.getUserToken();
    console.log('👤 Getting user profile');
    
    if (!token) {
      console.error('❌ No token available for profile request');
      return throwError(() => new Error('No authentication token'));
    }
    
    return this.http.get(`${this.apiUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).pipe(
      tap((response: any) => {
        console.log('✅ Profile response:', response);
        if (response.success && response.user) {
          localStorage.setItem('user_data', JSON.stringify(response.user));
          localStorage.setItem('email_verified', response.user.email_verified ? 'true' : 'false');
        }
      }),
      catchError((error: any) => {
        console.error('❌ Profile error:', error);
        // If endpoint doesn't exist, we'll handle it gracefully
        return throwError(() => error);
      })
    );
  }

  // ✅ ADMIN LOGIN - CORRECT ENDPOINT
  adminLogin(data: any): Observable<any> {
    console.log('🔐 Admin logging in:', data.email);
    
    return this.http.post(`${this.apiUrl}/api/admin/admin-login`, data).pipe(
      tap((response: any) => {
        console.log('✅ Admin login response:', response);
        if (response.success && response.token && response.admin) {
          localStorage.setItem('admin_token', response.token);
          localStorage.setItem('admin_data', JSON.stringify(response.admin));
          localStorage.setItem('adminLoggedIn', 'true');
          console.log('✅ Admin login successful');
        }
      }),
      catchError((error: any) => {
        console.error('❌ Admin login error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ TEST BACKEND CONNECTION
  testBackendConnection(): Observable<any> {
    console.log('🧪 Testing backend connection...');
    
    return this.http.get(`${this.apiUrl}/api/health`).pipe(
      tap((response: any) => {
        console.log('✅ Backend connection test:', response);
      }),
      catchError((error: any) => {
        console.error('❌ Backend connection test error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ TEST API ENDPOINT
  testApi(): Observable<any> {
    console.log('🧪 Testing API endpoint...');
    
    return this.http.get(`${this.apiUrl}/api/test`).pipe(
      tap((response: any) => {
        console.log('✅ API test result:', response);
      }),
      catchError((error: any) => {
        console.error('❌ API test error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ DEBUG FIREBASE CALLBACK
  debugFirebaseCallback(): Observable<any> {
    console.log('🐛 Debugging Firebase callback...');
    
    return this.http.get(`${this.apiUrl}/api/debug-firebase-callback`).pipe(
      tap((response: any) => {
        console.log('✅ Debug response:', response);
      }),
      catchError((error: any) => {
        console.error('❌ Debug error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ TEST EMAIL VERIFICATION
  testEmailVerification(email: string): Observable<any> {
    console.log('🧪 Testing email verification for:', email);
    
    return this.http.post(`${this.apiUrl}/api/test-email-verification`, { email }).pipe(
      tap((response: any) => {
        console.log('✅ Email test result:', response);
      }),
      catchError((error: any) => {
        console.error('❌ Email test error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ PRIVATE: Save user data to localStorage
  private saveUserData(token: string, user: any): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user_id', user.id);
    localStorage.setItem('user_data', JSON.stringify(user));
    localStorage.setItem('loggedIn', 'true');
    localStorage.setItem('email_verified', user.email_verified ? 'true' : 'false');
    this.clearPendingVerification();
  }

  // ✅ LOGOUT - clear all data
  logout(): void {
    const itemsToRemove = [
      'loggedIn', 'token', 'user_id', 'user_data', 'hasUpdated',
      'medicalInfoLastUpdated', 'adminLoggedIn', 'admin_token', 
      'admin_data', 'email_verified', 'pending_user_email',
      'pending_user_data', 'pending_verification_email'
    ];

    itemsToRemove.forEach(item => localStorage.removeItem(item));
    
    console.log('✅ User logged out - all data cleared');
  }

  // ✅ SAVE TOKEN
  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  // ✅ CHECK AUTHENTICATION
  isAuthenticated(): boolean {
    const loggedIn = localStorage.getItem('loggedIn');
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');
    const emailVerified = localStorage.getItem('email_verified') === 'true';
    
    return loggedIn === 'true' && !!(token && userId) && emailVerified;
  }

  // ✅ CHECK IF LOGGED IN BUT NOT VERIFIED
  isLoggedInButNotVerified(): boolean {
    const loggedIn = localStorage.getItem('loggedIn');
    const token = localStorage.getItem('token');
    const emailVerified = localStorage.getItem('email_verified') === 'true';
    
    return loggedIn === 'true' && !!token && !emailVerified;
  }

  // ✅ CHECK ADMIN AUTHENTICATION
  isAdminAuthenticated(): boolean {
    const adminLoggedIn = localStorage.getItem('adminLoggedIn');
    const adminToken = localStorage.getItem('admin_token');
    return adminLoggedIn === 'true' && !!adminToken;
  }

  // ✅ GET USER DATA
  getUserData(): any {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      const user = JSON.parse(userData);
      user.emailVerified = localStorage.getItem('email_verified') === 'true';
      return user;
    }
    return null;
  }

  // ✅ GET ADMIN DATA
  getAdminData(): any {
    const adminData = localStorage.getItem('admin_data');
    return adminData ? JSON.parse(adminData) : null;
  }

  // ✅ GET ADMIN TOKEN
  getAdminToken(): string | null {
    return localStorage.getItem('admin_token');
  }

  // ✅ GET USER TOKEN
  getUserToken(): string | null {
    return localStorage.getItem('token');
  }

  // ✅ CLEAR PENDING VERIFICATION
  clearPendingVerification(): void {
    localStorage.removeItem('pending_user_email');
    localStorage.removeItem('pending_user_data');
    localStorage.removeItem('pending_verification_email');
  }

  // ✅ CHECK IF USER JUST REGISTERED
  justRegistered(): boolean {
    return !!localStorage.getItem('pending_user_email');
  }

  // ✅ GET JUST REGISTERED USER DATA
  getJustRegisteredUser(): any {
    const userData = localStorage.getItem('pending_user_data');
    return userData ? JSON.parse(userData) : null;
  }

  // ✅ CHECK IF HAS PENDING VERIFICATION
  hasPendingVerification(): boolean {
    return !!localStorage.getItem('pending_verification_email') || 
           !!localStorage.getItem('pending_user_email');
  }

  // ✅ GET PENDING VERIFICATION EMAIL
  getPendingVerificationEmail(): string | null {
    return localStorage.getItem('pending_verification_email') || 
           localStorage.getItem('pending_user_email');
  }

  // ✅ SIMPLIFIED SYNC VERIFICATION (for use without password)
  syncVerificationStatus(email: string): Observable<any> {
    console.log('🔄 Simplified sync for:', email);
    
    // Try to use quick verify as it doesn't require password
    return this.quickVerifyEmail(email);
  }

  // ✅ GET ALL ENDPOINTS (for debugging)
  getAvailableEndpoints(): string[] {
    return [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/resend-verification',
      'POST /api/auth/check-sync-verification',
      'GET /api/auth/verification-status/:email',
      'POST /api/quick-verify',
      'POST /api/manual-sync-verification',
      'GET /api/health',
      'GET /api/test',
      'GET /api/debug-firebase-callback',
      'POST /api/test-email-verification',
      'POST /api/admin/admin-login'
    ];
  }
}
