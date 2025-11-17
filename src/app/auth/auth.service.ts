import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ✅ UPDATED: Register with email verification support
  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, data).pipe(
      tap((response: any) => {
        console.log('✅ Registration response:', response);
        
        if (response.user) {
          // Save basic user data (but not logged in until email verified)
          localStorage.setItem('pending_user_email', response.user.email);
          localStorage.setItem('pending_user_data', JSON.stringify(response.user));
          
          console.log('✅ User registered - email verification required');
        }
      }),
      catchError((error: any) => {
        console.error('❌ Registration error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ UPDATED: Login with email verification check
  login(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, data).pipe(
      tap((response: any) => {
        if (response.token && response.user) {
          // Save user data to localStorage
          localStorage.setItem('token', response.token);
          localStorage.setItem('user_id', response.user.id);
          localStorage.setItem('user_data', JSON.stringify(response.user));
          localStorage.setItem('loggedIn', 'true');
          localStorage.setItem('email_verified', response.user.emailVerified ? 'true' : 'false');
          
          // Clear pending registration data
          localStorage.removeItem('pending_user_email');
          localStorage.removeItem('pending_user_data');
          
          console.log('✅ User logged in successfully:', response.user.email);
        }
      }),
      catchError((error: any) => {
        console.error('❌ Login error:', error);
        
        // Handle email verification required error
        if (error.status === 403 && error.error?.requiresVerification) {
          console.log('📧 Email verification required for:', data.email);
          // Store email for resend verification
          localStorage.setItem('pending_verification_email', data.email);
        }
        
        return throwError(() => error);
      })
    );
  }

  // ✅ NEW: Verify email endpoint
  verifyEmail(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/verify-email`, { email }).pipe(
      tap((response: any) => {
        console.log('✅ Email verification successful:', response);
        
        // Clear pending verification data
        localStorage.removeItem('pending_verification_email');
        localStorage.removeItem('pending_user_email');
      }),
      catchError((error: any) => {
        console.error('❌ Email verification error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ NEW: Resend verification email
  resendVerificationEmail(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/resend-verification`, { email }).pipe(
      tap((response: any) => {
        console.log('✅ Verification email resent to:', email);
      }),
      catchError((error: any) => {
        console.error('❌ Resend verification error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ NEW: Check if user has pending email verification
  hasPendingVerification(): boolean {
    return !!localStorage.getItem('pending_verification_email') || 
           !!localStorage.getItem('pending_user_email');
  }

  // ✅ NEW: Get pending verification email
  getPendingVerificationEmail(): string | null {
    return localStorage.getItem('pending_verification_email') || 
           localStorage.getItem('pending_user_email');
  }

  // ✅ NEW: Get user data with verification status
  getUserData(): any {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      const user = JSON.parse(userData);
      user.emailVerified = localStorage.getItem('email_verified') === 'true';
      return user;
    }
    return null;
  }

  // ✅ UPDATED: Get user profile
  getProfile(): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.get(`${this.apiUrl}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // ✅ FIXED: Correct admin login endpoint
  adminLogin(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/admin-login`, data).pipe(
      tap((response: any) => {
        if (response.token && response.admin) {
          localStorage.setItem('admin_token', response.token);
          localStorage.setItem('admin_data', JSON.stringify(response.admin));
          localStorage.setItem('adminLoggedIn', 'true');
          console.log('✅ Admin login successful, data saved');
        }
      }),
      catchError((error: any) => {
        console.error('❌ Admin login error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ UPDATED: Logout - clear all data including verification data
  logout(): void {
    // Clear all authentication data
    const itemsToRemove = [
      'loggedIn', 'token', 'user_id', 'user_data', 'hasUpdated',
      'medicalInfoLastUpdated', 'adminLoggedIn', 'admin_token', 
      'admin_data', 'email_verified', 'pending_user_email',
      'pending_user_data', 'pending_verification_email'
    ];

    itemsToRemove.forEach(item => localStorage.removeItem(item));
    
    console.log('✅ User logged out - all data cleared');
  }

  saveToken(token: any) {
    localStorage.setItem('token', token);
  }

  // ✅ UPDATED: Check authentication with email verification
  isAuthenticated(): boolean {
    const loggedIn = localStorage.getItem('loggedIn');
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');
    const emailVerified = localStorage.getItem('email_verified') === 'true';
    
    return loggedIn === 'true' && !!(token && userId) && emailVerified;
  }

  // ✅ Check if user is logged in but email not verified
  isLoggedInButNotVerified(): boolean {
    const loggedIn = localStorage.getItem('loggedIn');
    const token = localStorage.getItem('token');
    const emailVerified = localStorage.getItem('email_verified') === 'true';
    
    return loggedIn === 'true' && !!token && !emailVerified;
  }

  // ✅ IMPROVED: Check admin authentication
  isAdminAuthenticated(): boolean {
    const adminLoggedIn = localStorage.getItem('adminLoggedIn');
    const adminToken = localStorage.getItem('admin_token');
    return adminLoggedIn === 'true' && !!adminToken;
  }

  // ✅ Get admin data
  getAdminData(): any {
    const adminData = localStorage.getItem('admin_data');
    return adminData ? JSON.parse(adminData) : null;
  }

  // ✅ Get admin token for API calls
  getAdminToken(): string | null {
    return localStorage.getItem('admin_token');
  }

  // ✅ Get user token for API calls
  getUserToken(): string | null {
    return localStorage.getItem('token');
  }

  // ✅ NEW: Clear pending verification data
  clearPendingVerification(): void {
    localStorage.removeItem('pending_user_email');
    localStorage.removeItem('pending_user_data');
    localStorage.removeItem('pending_verification_email');
  }

  // ✅ NEW: Check if user just registered and needs verification
  justRegistered(): boolean {
    return !!localStorage.getItem('pending_user_email');
  }

  // ✅ NEW: Get just registered user data
  getJustRegisteredUser(): any {
    const userData = localStorage.getItem('pending_user_data');
    return userData ? JSON.parse(userData) : null;
  }
}
