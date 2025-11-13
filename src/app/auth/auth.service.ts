import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../Environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isLoggedIn = false;
  private isAdminLoggedIn = false;

private userUrl = `${environment.apiUrl}/auth`;
private adminUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  // USER REGISTER
  register(data: { full_name: string; email: string; username: string; password: string }): Observable<any> {
    return this.http.post(`${this.userUrl}/register`, data);
  }

  // USER LOGIN
  login(data: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.userUrl}/login`, data).pipe(
      tap((res: any) => {
        this.isLoggedIn = true;
        localStorage.setItem('loggedIn', 'true');
        if (res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user_id', res.user?.id);
        }
      })
    );
  }

  // ADMIN LOGIN
  adminLogin(data: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.adminUrl}/admin-login`, data).pipe(
      tap((res: any) => {
        this.isAdminLoggedIn = true;
        localStorage.setItem('adminLoggedIn', 'true');
        if (res.token) {
          localStorage.setItem('adminToken', res.token);
          localStorage.setItem('admin_id', res.admin?.id);
          localStorage.setItem('admin_role', res.admin?.role);
          localStorage.setItem('admin_name', res.admin?.full_name || 'Administrator');
        }
      })
    );
  }

  // USER LOGOUT
  logout(): void {
    this.isLoggedIn = false;
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
  }

  // ADMIN LOGOUT
  adminLogout(): void {
    this.isAdminLoggedIn = false;
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin_id');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_name');
  }

  // CHECK USER AUTHENTICATION
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const loggedIn = localStorage.getItem('loggedIn');
    return token !== null && loggedIn === 'true';
  }

  // CHECK ADMIN AUTHENTICATION
  isAdminAuthenticated(): boolean {
    if (!this.isAdminLoggedIn) {
      this.isAdminLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    }
    return this.isAdminLoggedIn;
  }

  // GET CURRENT USER ID
  getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  // GET CURRENT ADMIN ID
  getAdminId(): string | null {
    return localStorage.getItem('admin_id');
  }
}
