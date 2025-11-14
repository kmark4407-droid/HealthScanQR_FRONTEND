import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, data);
  }

  // ✅ ADD MISSING METHODS
  adminLogin(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/login`, data);
  }

  logout(): void {
    // Clear all authentication data
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('hasUpdated');
    localStorage.removeItem('medicalInfoLastUpdated');
    localStorage.removeItem('adminLoggedIn');
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

  // ✅ ADD THIS METHOD for admin guard
  isAdminAuthenticated(): boolean {
    const adminLoggedIn = localStorage.getItem('adminLoggedIn');
    return adminLoggedIn === 'true';
  }
}
