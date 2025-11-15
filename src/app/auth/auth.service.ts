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

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, data);
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, data);
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
    localStorage.removeItem('hasUpdated');
    localStorage.removeItem('medicalInfoLastUpdated');
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    console.log('✅ User logged out');
  }

  saveToken(token: any) {
    localStorage.setItem('token', token);
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');
    return !!(token && userId);
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
}
