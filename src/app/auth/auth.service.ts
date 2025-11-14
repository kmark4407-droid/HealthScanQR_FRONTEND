import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../Environments/environment.prod';

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

  saveToken(token: any) {
    localStorage.setItem('token', token);
  }

  // ✅ ADD THIS MISSING METHOD
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');
    
    console.log('🔐 Auth check - token:', !!token, 'user_id:', userId);
    
    return !!(token && userId); // Returns true if both exist
  }
}
