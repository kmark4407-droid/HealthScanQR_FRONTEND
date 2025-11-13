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
    // Clear any existing user sessions when accessing admin login
    if (this.auth.isAuthenticated()) {
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

    this.auth.adminLogin(this.loginForm.value).subscribe({
      next: (res: any) => {
        if (button) {
          button.innerHTML = '<i class="fas fa-check"></i> Access Granted!';
          this.renderer.setStyle(button, 'background', '#2ecc71');
        }

        // Redirect to admin dashboard
        setTimeout(() => {
          this.router.navigateByUrl('/Admin');
        }, 1000);
      },
      error: (err: any) => {
        if (button) {
          button.innerHTML = 'Admin Login';
          button.disabled = false;
          this.renderer.removeStyle(button, 'background');
        }
        
        this.errorMessage = err.error?.message || 'Admin authentication failed. Please check your credentials.';
        console.error('Admin login error:', err);
      }
    });
  }
}