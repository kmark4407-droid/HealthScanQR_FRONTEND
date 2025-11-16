import { Component, ElementRef, Renderer2, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from './../auth/auth.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  templateUrl: './admin-login.html',
  styleUrls: ['./admin-login.css']
})
export class AdminLoginComponent implements OnInit {
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
    // Clear any existing admin sessions when accessing admin login
    if (this.auth.isAdminAuthenticated()) {
      this.auth.logout();
    }

    const inputs: NodeListOf<HTMLInputElement> = this.el.nativeElement.querySelectorAll('input');
    inputs.forEach(input => {
      this.renderer.listen(input, 'focus', () => {
        const label = input.parentElement?.querySelector('label');
        if (label) this.renderer.setStyle(label, 'color', '#8B0000');
      });

      this.renderer.listen(input, 'blur', () => {
        const label = input.parentElement?.querySelector('label');
        if (label) this.renderer.setStyle(label, 'color', '#34495e');
      });
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach(field => {
        const control = this.loginForm.get(field);
        const input: HTMLElement | null = this.el.nativeElement.querySelector(`[formControlName="${field}"]`);
        if (control && control.invalid && input) {
          this.renderer.setStyle(input, 'borderColor', '#e74c3c');
        }
      });
      return;
    }

    const button: HTMLButtonElement | null = this.el.nativeElement.querySelector('button');
    if (button) {
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
      button.disabled = true;
    }

    this.errorMessage = '';
    this.isLoading = true;

    console.log('🔄 Attempting admin login with:', this.loginForm.value);

    this.auth.adminLogin(this.loginForm.value).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        console.log('✅ Admin login successful:', res);

        if (button) {
          button.innerHTML = '<i class="fas fa-check"></i> Access Granted!';
          this.renderer.setStyle(button, 'background', '#2ecc71');
        }

        // Redirect to admin dashboard
        setTimeout(() => {
          this.router.navigate(['/Admin']);
        }, 1000);
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('❌ Admin login error:', err);

        if (button) {
          button.innerHTML = 'Admin Login';
          button.disabled = false;
          this.renderer.removeStyle(button, 'background');
        }
        
        this.errorMessage = err.error?.message || 'Admin authentication failed. Please check your credentials.';
        
        // More specific error messages
        if (err.status === 404) {
          this.errorMessage = 'Admin endpoint not found. Please contact administrator.';
        } else if (err.status === 401) {
          this.errorMessage = 'Invalid admin credentials. Please check your email and password.';
        } else if (err.status === 500) {
          this.errorMessage = 'Server error. Please try again later.';
        }
      }
    });
  }
}
