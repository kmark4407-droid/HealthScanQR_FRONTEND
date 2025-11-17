import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../Environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = environment.apiUrl; // ✅ REMOVED /auth from base URL

  constructor(private http: HttpClient) {}

  // ✅ UPDATED: Use the new working register endpoint
  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/simple-auth/register`, data).pipe(
      tap((response: any) => {
        if (response.success && response.token && response.user) {
          // Save user data to localStorage
          localStorage.setItem('token', response.token);
          localStorage.setItem('user_id', response.user.id);
          localStorage.setItem('user_data', JSON.stringify(response.user));
          localStorage.setItem('loggedIn', 'true');
          console.log('✅ User registered successfully:', response.user.email);
        }
      })
    );
  }

  // ✅ UPDATED: Use the new working login endpoint
  login(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/simple-auth/login`, data).pipe(
      tap((response: any) => {
        if (response.success && response.token && response.user) {
          // Save user data to localStorage
          localStorage.setItem('token', response.token);
          localStorage.setItem('user_id', response.user.id);
          localStorage.setItem('user_data', JSON.stringify(response.user));
          localStorage.setItem('loggedIn', 'true');
          console.log('✅ User logged in successfully:', response.user.email);
        }
      })
    );
  }

  // ✅ NEW: Get user profile using the new endpoint
  getProfile(): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.get(`${this.apiUrl}/simple-auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // ✅ NEW: Get user data from localStorage
  getUserData(): any {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
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
      })
    );
  }

  logout(): void {
    // Clear all authentication data
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_data');
    localStorage.removeItem('hasUpdated');
    localStorage.removeItem('medicalInfoLastUpdated');
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    console.log('✅ User logged out - all data cleared');
  }

  saveToken(token: any) {
    localStorage.setItem('token', token);
  }

  // ✅ IMPROVED: Check both flag and token
  isAuthenticated(): boolean {
    const loggedIn = localStorage.getItem('loggedIn');
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');
    return loggedIn === 'true' && !!(token && userId);
  }

  // ✅ IMPROVED: Check both flag and token
  isAdminAuthenticated(): boolean {
    const adminLoggedIn = localStorage.getItem('adminLoggedIn');
    const adminToken = localStorage.getItem('admin_token');
    return adminLoggedIn === 'true' && !!adminToken;
  }

  // ✅ NEW: Get admin data
  getAdminData(): any {
    const adminData = localStorage.getItem('admin_data');
    return adminData ? JSON.parse(adminData) : null;
  }

  // ✅ NEW: Get admin token for API calls
  getAdminToken(): string | null {
    return localStorage.getItem('admin_token');
  }

  // ✅ NEW: Get user token for API calls
  getUserToken(): string | null {
    return localStorage.getItem('token');
  }
}
