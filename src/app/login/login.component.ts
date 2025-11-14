import { Component, ElementRef, Renderer2, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../Environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage = '';
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private http: HttpClient,
    private el: ElementRef,
    private renderer: Renderer2,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    console.log('🔐 Login Component Initialized');
    
    // Clear any previous auth data
    this.clearAuthData();
  }

  // ✅ Clear all authentication data
  private clearAuthData(): void {
    console.log('🧹 Clearing previous auth data');
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('hasUpdated');
    localStorage.removeItem('medicalInfoLastUpdated');
  }

  submit(): void {
    console.log('🔄 Login form submitted');

    if (this.loginForm.invalid) {
      console.log('❌ Form invalid');
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    console.log('🌐 Making login API call...');

    this.auth.login(this.loginForm.value).subscribe({
      next: (res: any) => {
        console.log('✅ LOGIN SUCCESS:', res);
        
        // ✅ Store authentication data
        localStorage.setItem('loggedIn', 'true');
        localStorage.setItem('token', res.token);
        
        if (res.user && res.user.id) {
          localStorage.setItem('user_id', res.user.id.toString());
          console.log('👤 User ID stored:', res.user.id);
        } else {
          console.error('❌ No user data in response');
          this.handleLoginError('Invalid response from server');
          return;
        }

        // 🚨 TEMPORARY FIX: SKIP MEDICAL CHECK - GO DIRECTLY TO UPDATE
        console.log('🚨 TEMPORARY: Skipping medical check, going directly to update-info');
        localStorage.setItem('hasUpdated', 'false'); // Force update page
        this.router.navigate(['/update-info']);
        
        /* 
        // Original medical check code (commented out for now)
        const userId = localStorage.getItem('user_id');
        console.log('🔍 Checking medical data for user:', userId);

        this.http.get(`${environment.apiUrl}/medical/${userId}`).subscribe({
          next: (medicalRes: any) => {
            console.log('✅ Medical check response:', medicalRes);
            
            if (medicalRes && medicalRes.exists) {
              console.log('🎉 Medical info exists, going to landing');
              localStorage.setItem('hasUpdated', 'true');
              this.router.navigate(['/landing']);
            } else {
              console.log('ℹ️ No medical info, going to update-info');
              localStorage.setItem('hasUpdated', 'false');
              this.router.navigate(['/update-info']);
            }
          },
          error: (err) => {
            console.error('❌ Medical check failed:', err);
            // Even if medical check fails, go to update page
            console.log('⚠️ Medical check failed, going to update-info anyway');
            localStorage.setItem('hasUpdated', 'false');
            this.router.navigate(['/update-info']);
          }
        });
        */
      },
      error: (err) => {
        console.error('❌ LOGIN ERROR:', err);
        this.handleLoginError(err.error?.message || 'Login failed. Please try again.');
      }
    });
  }

  // ✅ Mark all form fields as touched to show validation errors
  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  // ✅ Handle login errors
  private handleLoginError(message: string): void {
    this.errorMessage = message;
    this.isLoading = false;
    console.error('🚫 Login failed:', message);
  }

  // ✅ Demo login for testing
  useDemoAccount(): void {
    console.log('🎮 Using demo account');
    this.loginForm.patchValue({
      email: 'demo@healthscan.com',
      password: 'demo123'
    });
    this.submit();
  }

  // ✅ Navigate to register
  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
