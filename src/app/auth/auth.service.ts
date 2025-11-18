// auth.service.ts - CLEAN VERSION
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

  // ✅ REGISTER with email verification
  register(data: any): Observable<any> {
    console.log('📝 Registering user:', data.email);
    
    return this.http.post(`${this.apiUrl}/api/auth/register`, data).pipe(
      tap((response: any) => {
        console.log('✅ Registration response:', response);
        
        if (response.success) {
          localStorage.setItem('pending_user_email', response.user.email);
          localStorage.setItem('pending_user_data', JSON.stringify(response.user));
          
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

  // ✅ LOGIN with email verification check
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

  // ✅ RESEND VERIFICATION EMAIL
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

  // ✅ SYNC VERIFICATION STATUS (after clicking email link)
  syncVerificationStatus(email: string): Observable<any> {
    console.log('🔄 Syncing verification for:', email);
    
    return this.http.post(`${this.apiUrl}/api/auth/verify-email-callback`, { email }).pipe(
      tap((response: any) => {
        console.log('✅ Sync response:', response);
        if (response.success && response.verified) {
          this.clearPendingVerification();
          console.log('✅ Email verified and synced');
        }
      }),
      catchError((error: any) => {
        console.error('❌ Sync error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ QUICK VERIFY (instant verification for testing)
  quickVerifyEmail(email: string): Observable<any> {
    console.log('⚡ Quick verifying:', email);
    
    return this.http.post(`${this.apiUrl}/api/auth/quick-verify`, { email }).pipe(
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

  // ✅ CHECK VERIFICATION STATUS
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

  // ✅ TEST FIREBASE CONNECTION
  testFirebaseConnection(): Observable<any> {
    console.log('🧪 Testing Firebase connection...');
    
    return this.http.post(`${this.apiUrl}/api/auth/test-firebase`, {}).pipe(
      tap((response: any) => {
        console.log('✅ Firebase test:', response);
      }),
      catchError((error: any) => {
        console.error('❌ Firebase test error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ TEST EMAIL DELIVERY
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

  // ✅ GET USER PROFILE
  getProfile(): Observable<any> {
    const token = this.getUserToken();
    console.log('👤 Getting user profile');
    
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
        return throwError(() => error);
      })
    );
  }

  // ✅ ADMIN LOGIN
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
}
