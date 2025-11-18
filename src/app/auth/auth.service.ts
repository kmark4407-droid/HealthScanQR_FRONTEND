// auth.service.ts - CORRECTED VERSION (NO DUPLICATE /api)
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../Environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    console.log('🔧 AuthService initialized with API URL:', this.apiUrl);
  }

  // ✅ REGISTER - CORRECT ENDPOINT (NO /api prefix)
  register(data: any): Observable<any> {
    const url = `${this.apiUrl}/auth/register`;
    console.log('📝 Registering user:', data.email);
    console.log('🔧 REGISTER URL:', url);
    
    return this.http.post(url, data).pipe(
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

  // ✅ LOGIN - CORRECT ENDPOINT (NO /api prefix)
  login(data: any): Observable<any> {
    const url = `${this.apiUrl}/auth/login`;
    console.log('🔐 Logging in user:', data.email);
    console.log('🔧 LOGIN URL:', url);
    
    return this.http.post(url, data).pipe(
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

  // ✅ ADMIN LOGIN - CORRECT ENDPOINT (NO /api prefix)
  adminLogin(data: any): Observable<any> {
    const url = `${this.apiUrl}/admin/admin-login`;
    console.log('🔐 Admin logging in:', data.email);
    console.log('🔧 ADMIN LOGIN URL:', url);
    
    return this.http.post(url, data).pipe(
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

  // ✅ RESEND VERIFICATION - CORRECT ENDPOINT (NO /api prefix)
  resendVerificationEmail(email: string): Observable<any> {
    const url = `${this.apiUrl}/auth/resend-verification`;
    console.log('📧 Resending verification to:', email);
    
    return this.http.post(url, { email }).pipe(
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

  // ✅ CHECK SYNC VERIFICATION - CORRECT ENDPOINT (NO /api prefix)
  checkSyncVerification(email: string, password: string): Observable<any> {
    const url = `${this.apiUrl}/auth/check-sync-verification`;
    console.log('🔄 Checking sync verification for:', email);
    
    return this.http.post(url, { 
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

  // ✅ QUICK VERIFY - CORRECT ENDPOINT (NO /api prefix)
  quickVerifyEmail(email: string): Observable<any> {
    const url = `${this.apiUrl}/auth/quick-verify`;
    console.log('⚡ Quick verifying:', email);
    
    return this.http.post(url, { email }).pipe(
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

  // ✅ CHECK VERIFICATION STATUS - CORRECT ENDPOINT (NO /api prefix)
  checkVerificationStatus(email: string): Observable<any> {
    const url = `${this.apiUrl}/auth/verification-status/${email}`;
    console.log('🔍 Checking verification status for:', email);
    
    return this.http.get(url).pipe(
      tap((response: any) => {
        console.log('✅ Verification status:', response);
      }),
      catchError((error: any) => {
        console.error('❌ Status check error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ GET USER PROFILE - CORRECT ENDPOINT (NO /api prefix)
  getProfile(): Observable<any> {
    const url = `${this.apiUrl}/auth/me`;
    const token = this.getUserToken();
    console.log('👤 Getting user profile');
    
    if (!token) {
      console.error('❌ No token available for profile request');
      return throwError(() => new Error('No authentication token'));
    }
    
    return this.http.get(url, {
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
        return throwError(() => error);
      })
    );
  }

  // ✅ TEST BACKEND CONNECTION (NO /api prefix)
  testBackendConnection(): Observable<any> {
    const url = `${this.apiUrl}/health`;
    console.log('🧪 Testing backend connection...');
    
    return this.http.get(url).pipe(
      tap((response: any) => {
        console.log('✅ Backend connection test:', response);
      }),
      catchError((error: any) => {
        console.error('❌ Backend connection test error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ TEST API ENDPOINT (NO /api prefix)
  testApi(): Observable<any> {
    const url = `${this.apiUrl}/test`;
    console.log('🧪 Testing API endpoint...');
    
    return this.http.get(url).pipe(
      tap((response: any) => {
        console.log('✅ API test result:', response);
      }),
      catchError((error: any) => {
        console.error('❌ API test error:', error);
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
    
    // Use quick verify as it doesn't require password
    return this.quickVerifyEmail(email);
  }
}
