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
  showPassword = false;

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
    console.log('🔐 Login Component');
    this.clearAuthData();

    const inputs: NodeListOf<HTMLInputElement> = this.el.nativeElement.querySelectorAll('input');
    inputs.forEach(input => {
      this.renderer.listen(input, 'focus', () => {
        const label = input.parentElement?.querySelector('label');
        if (label) this.renderer.setStyle(label, 'color', '#4b6cb7');
      });

      this.renderer.listen(input, 'blur', () => {
        const label = input.parentElement?.querySelector('label');
        if (label) this.renderer.setStyle(label, 'color', '#34495e');
      });
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    
    if (passwordInput) {
      passwordInput.type = this.showPassword ? 'text' : 'password';
      setTimeout(() => passwordInput.focus(), 0);
    }
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
      
      Object.keys(this.loginForm.controls).forEach(field => {
        const control = this.loginForm.get(field);
        const input: HTMLElement | null = this.el.nativeElement.querySelector(`[formControlName="${field}"]`);
        if (control && control.invalid && input) {
          this.renderer.setStyle(input, 'borderColor', '#e74c3c');
        }
      });
      return;
    }

    console.log('🔐 Attempting login via AuthService...');
    console.log('📧 Email:', this.loginForm.value.email);

    const button: HTMLButtonElement | null = this.el.nativeElement.querySelector('button[type="submit"]');
    if (button) {
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
      button.disabled = true;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // ✅ ONLY USE AUTH SERVICE - NO DIRECT HTTP CALLS
    this.auth.login(this.loginForm.value).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        console.log('✅ Login successful via AuthService');
        
        if (button) {
          button.innerHTML = '<i class="fas fa-check"></i> Access Granted!';
          this.renderer.setStyle(button, 'background', '#2ecc71');
        }

        localStorage.setItem('loggedIn', 'true');
        localStorage.setItem('token', res.token);
        
        if (res.user && res.user.id) {
          localStorage.setItem('user_id', res.user.id.toString());
        }

        // ✅ FIXED: Check if user has medical info and redirect accordingly
        setTimeout(() => {
          if (res.hasMedicalInfo) {
            console.log('✅ User has medical info, redirecting to landing');
            localStorage.setItem('hasUpdated', 'true');
            this.router.navigate(['/landing']);
          } else {
            console.log('📝 User needs to fill medical info, redirecting to update-info');
            localStorage.setItem('hasUpdated', 'false');
            this.router.navigate(['/update-info']);
          }
        }, 1000);
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('❌ Login failed via AuthService:', err);

        if (button) {
          button.innerHTML = 'Login';
          button.disabled = false;
          this.renderer.removeStyle(button, 'background');
        }

        this.errorMessage = err.error?.message || 'Login failed. Please try again.';
        
        if (err.status === 404) {
          this.errorMessage = 'Login endpoint not found. Please contact administrator.';
        } else if (err.status === 401) {
          this.errorMessage = 'Invalid credentials. Please check your email and password.';
        } else if (err.status === 500) {
          this.errorMessage = 'Server error. Please try again later.';
        } else if (err.status === 0) {
          this.errorMessage = 'Cannot connect to server. Please check your internet connection.';
        } else if (err.error?.requiresVerification) {
          this.errorMessage = 'Email not verified. Please check your email for verification link.';
          localStorage.setItem('pending_verification_email', this.loginForm.value.email);
        }
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
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
