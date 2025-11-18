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

  // ✅ FIXED: Register with correct endpoint and email verification handling
  register(data: any): Observable<any> {
    console.log('📝 Registering user with data:', data);
    
    return this.http.post(`${this.apiUrl}/api/auth/register`, data).pipe(
      tap((response: any) => {
        console.log('✅ Registration response:', response);
        
        if (response.success) {
          if (response.token && response.user) {
            // Auto-login if user is verified
            if (response.user.email_verified) {
              this.saveUserData(response.token, response.user);
              console.log('✅ User registered and auto-verified - logged in automatically');
            } else {
              // Save pending verification data
              localStorage.setItem('pending_user_email', response.user.email);
              localStorage.setItem('pending_user_data', JSON.stringify(response.user));
              console.log('✅ User registered - email verification required');
            }
          }
        }
      }),
      catchError((error: any) => {
        console.error('❌ Registration error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ FIXED: Login with correct endpoint and verification handling
  login(data: any): Observable<any> {
    console.log('🔐 Logging in user:', data.email);
    
    return this.http.post(`${this.apiUrl}/api/auth/login`, data).pipe(
      tap((response: any) => {
        console.log('✅ Login response:', response);
        
        if (response.success && response.token && response.user) {
          this.saveUserData(response.token, response.user);
          console.log('✅ User logged in successfully:', response.user.email);
        }
      }),
      catchError((error: any) => {
        console.error('❌ Login error:', error);
        
        // Handle specific error cases
        if (error.error?.message?.includes('not verified')) {
          // Store email for resend verification
          localStorage.setItem('pending_verification_email', data.email);
        }
        
        return throwError(() => error);
      })
    );
  }

  // ✅ FIXED: Resend verification email with correct endpoint
  resendVerificationEmail(email: string): Observable<any> {
    console.log('📧 Resending verification email to:', email);
    
    return this.http.post(`${this.apiUrl}/api/auth/resend-verification`, { email }).pipe(
      tap((response: any) => {
        console.log('✅ Resend verification response:', response);
        if (response.success) {
          console.log('✅ Verification email sent successfully');
        }
      }),
      catchError((error: any) => {
        console.error('❌ Resend verification error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ FIXED: Quick verify endpoint (instant verification for testing)
  quickVerifyEmail(email: string): Observable<any> {
    console.log('⚡ Quick verifying email:', email);
    
    return this.http.post(`${this.apiUrl}/api/auth/quick-verify`, { email }).pipe(
      tap((response: any) => {
        console.log('✅ Quick verify response:', response);
        if (response.success) {
          // Clear pending verification data
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

  // ✅ FIXED: Sync verification status after clicking email link
  syncVerificationStatus(email: string): Observable<any> {
    console.log('🔄 Syncing verification status for:', email);
    
    return this.http.post(`${this.apiUrl}/api/auth/verify-email-callback`, { email }).pipe(
      tap((response: any) => {
        console.log('✅ Sync verification response:', response);
        if (response.success && response.verified) {
          this.clearPendingVerification();
          console.log('✅ Email verified and synced successfully');
        }
      }),
      catchError((error: any) => {
        console.error('❌ Sync verification error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ FIXED: Get user profile with correct endpoint
  getProfile(): Observable<any> {
    const token = this.getUserToken();
    console.log('👤 Getting user profile with token:', token ? 'present' : 'missing');
    
    return this.http.get(`${this.apiUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).pipe(
      tap((response: any) => {
        console.log('✅ Profile response:', response);
        if (response.success && response.user) {
          // Update stored user data
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

  // ✅ FIXED: Admin login with correct endpoint
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

  // ✅ FIXED: Check verification status
  checkVerificationStatus(email: string): Observable<any> {
    console.log('🔍 Checking verification status for:', email);
    
    return this.http.get(`${this.apiUrl}/api/auth/verification-status/${email}`).pipe(
      tap((response: any) => {
        console.log('✅ Verification status:', response);
      }),
      catchError((error: any) => {
        console.error('❌ Check verification error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ FIXED: Test Firebase connection
  testFirebaseConnection(): Observable<any> {
    console.log('🧪 Testing Firebase connection...');
    
    return this.http.post(`${this.apiUrl}/api/auth/test-firebase`, {}).pipe(
      tap((response: any) => {
        console.log('✅ Firebase test result:', response);
      }),
      catchError((error: any) => {
        console.error('❌ Firebase test error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ FIXED: Test email delivery
  testEmailDelivery(email: string): Observable<any> {
    console.log('🧪 Testing email delivery to:', email);
    
    return this.http.post(`${this.apiUrl}/api/auth/test-email-delivery`, { email }).pipe(
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
    
    // Clear any pending verification data
    this.clearPendingVerification();
  }

  // ✅ UPDATED: Logout - clear all data
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

  // ✅ FIXED: Save token method
  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  // ✅ FIXED: Check authentication with proper verification
  isAuthenticated(): boolean {
    const loggedIn = localStorage.getItem('loggedIn');
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');
    const emailVerified = localStorage.getItem('email_verified') === 'true';
    
    return loggedIn === 'true' && !!(token && userId) && emailVerified;
  }

  // ✅ FIXED: Check if logged in but not verified
  isLoggedInButNotVerified(): boolean {
    const loggedIn = localStorage.getItem('loggedIn');
    const token = localStorage.getItem('token');
    const emailVerified = localStorage.getItem('email_verified') === 'true';
    
    return loggedIn === 'true' && !!token && !emailVerified;
  }

  // ✅ FIXED: Check admin authentication
  isAdminAuthenticated(): boolean {
    const adminLoggedIn = localStorage.getItem('adminLoggedIn');
    const adminToken = localStorage.getItem('admin_token');
    return adminLoggedIn === 'true' && !!adminToken;
  }

  // ✅ Get user data
  getUserData(): any {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      const user = JSON.parse(userData);
      user.emailVerified = localStorage.getItem('email_verified') === 'true';
      return user;
    }
    return null;
  }

  // ✅ Get admin data
  getAdminData(): any {
    const adminData = localStorage.getItem('admin_data');
    return adminData ? JSON.parse(adminData) : null;
  }

  // ✅ Get admin token
  getAdminToken(): string | null {
    return localStorage.getItem('admin_token');
  }

  // ✅ Get user token
  getUserToken(): string | null {
    return localStorage.getItem('token');
  }

  // ✅ Clear pending verification data
  clearPendingVerification(): void {
    localStorage.removeItem('pending_user_email');
    localStorage.removeItem('pending_user_data');
    localStorage.removeItem('pending_verification_email');
  }

  // ✅ Check if user just registered
  justRegistered(): boolean {
    return !!localStorage.getItem('pending_user_email');
  }

  // ✅ Get just registered user data
  getJustRegisteredUser(): any {
    const userData = localStorage.getItem('pending_user_data');
    return userData ? JSON.parse(userData) : null;
  }

  // ✅ Check if has pending verification
  hasPendingVerification(): boolean {
    return !!localStorage.getItem('pending_verification_email') || 
           !!localStorage.getItem('pending_user_email');
  }

  // ✅ Get pending verification email
  getPendingVerificationEmail(): string | null {
    return localStorage.getItem('pending_verification_email') || 
           localStorage.getItem('pending_user_email');
  }
}
