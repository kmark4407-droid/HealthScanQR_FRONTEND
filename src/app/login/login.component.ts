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
    console.log('🔐 Login Component - No Alerts Version');
    this.clearAuthData();
  }

  private clearAuthData(): void {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('hasUpdated');
  }

  submit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.auth.login(this.loginForm.value).subscribe({
      next: (res: any) => {
        console.log('✅ Login successful');
        
        localStorage.setItem('loggedIn', 'true');
        localStorage.setItem('token', res.token);
        
        if (res.user && res.user.id) {
          localStorage.setItem('user_id', res.user.id.toString());
        }

        // 🚨 COMPLETELY SKIP MEDICAL CHECK - NO ALERTS
        console.log('➡️ Going to update-info (medical check skipped)');
        localStorage.setItem('hasUpdated', 'false');
        this.router.navigate(['/update-info']);
      },
      error: (err) => {
        console.error('❌ Login failed:', err);
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Login failed. Please try again.';
      }
    });
  }

  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  useDemoAccount(): void {
    this.loginForm.patchValue({
      email: 'test@example.com',
      password: 'password123'
    });
    this.submit();
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
