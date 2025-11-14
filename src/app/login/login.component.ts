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
    console.log('🔐 Login Component Initialized - DEBUG MODE');
    console.log('📍 Current environment:', environment);
    console.log('🌐 API URL:', environment.apiUrl);
    
    // Clear any previous auth data
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
    console.log('📧 Form values:', this.loginForm.value);

    if (this.loginForm.invalid) {
      console.log('❌ Form invalid - marking errors');
      Object.keys(this.loginForm.controls).forEach(field => {
        const control = this.loginForm.get(field);
        const input: HTMLElement | null = this.el.nativeElement.querySelector(`[formControlName="${field}"]`);
        if (control && control.invalid && input) {
          this.renderer.setStyle(input, 'borderColor', '#e74c3c');
          console.log(`❌ Field ${field} is invalid:`, control.errors);
        }
      });
      return;
    }

    console.log('✅ Form is valid, proceeding with login');

    const button: HTMLButtonElement | null = this.el.nativeElement.querySelector('button');
    if (button) {
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      button.disabled = true;
    }

    this.isLoading = true;
    this.errorMessage = '';

    console.log('🌐 Making login API call to:', `${environment.apiUrl}/auth/login`);

    this.auth.login(this.loginForm.value).subscribe({
      next: (res: any) => {
        console.log('✅ LOGIN SUCCESS - Full response:', res);
        
        if (button) {
          button.innerHTML = '<i class="fas fa-check"></i> Success!';
          this.renderer.setStyle(button, 'background', '#2ecc71');
        }

        // ✅ Store authentication data
        localStorage.setItem('loggedIn', 'true');
        localStorage.setItem('token', res.token);
        
        // ✅ Check if user data exists in response
        if (res.user && res.user.id) {
          localStorage.setItem('user_id', res.user.id.toString());
          console.log('👤 User ID stored:', res.user.id);
          
          // ✅ Store additional user info if available
          if (res.user.full_name) {
            localStorage.setItem('user_name', res.user.full_name);
          }
          if (res.user.email) {
            localStorage.setItem('user_email', res.user.email);
          }
        } else {
          console.error('❌ No user data in login response:', res);
          this.handleLoginError('Invalid response from server - no user data');
          return;
        }

        console.log('💾 localStorage after login:', {
          loggedIn: localStorage.getItem('loggedIn'),
          user_id: localStorage.getItem('user_id'),
          token: localStorage.getItem('token'),
          user_name: localStorage.getItem('user_name')
        });

        const userId = localStorage.getItem('user_id');
        console.log('🔍 Checking medical data for user:', userId);

        if (!userId) {
          console.error('❌ No user_id found after login');
          this.handleLoginError('Authentication failed - no user ID');
          return;
        }

        // ✅ Check if user already has medical info
        const medicalCheckUrl = `${environment.apiUrl}/medical/${userId}`;
        console.log('🌐 Making medical check API call to:', medicalCheckUrl);

        this.http.get(medicalCheckUrl).subscribe({
          next: (medicalRes: any) => {
            console.log('✅ MEDICAL CHECK SUCCESS - Full response:', medicalRes);
            
            if (medicalRes && medicalRes.exists) {
              console.log('🎉 Medical info EXISTS, redirecting to landing');
              localStorage.setItem('hasUpdated', 'true');
              this.router.navigate(['/landing']);
            } else if (medicalRes && Object.keys(medicalRes).length > 0) {
              // Handle old response format (without exists property)
              console.log('🎉 Medical info EXISTS (old format), redirecting to landing');
              localStorage.setItem('hasUpdated', 'true');
              this.router.navigate(['/landing']);
            } else {
              console.log('ℹ️ No medical info found, redirecting to update-info');
              localStorage.setItem('hasUpdated', 'false');
              this.router.navigate(['/update-info']);
            }
          },
          error: (err) => {
            console.error('❌ MEDICAL CHECK ERROR - Full details:', {
              status: err.status,
              statusText: err.statusText,
              message: err.message,
              error: err.error,
              url: err.url
            });

            // ✅ Even if medical check fails, continue to update page
            console.log('⚠️ Medical check failed, but continuing to update-info');
            localStorage.setItem('hasUpdated', 'false');
            this.router.navigate(['/update-info']);
          }
        });
      },
      error: (err) => {
        console.error('❌ LOGIN ERROR - Full details:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          error: err.error,
          url: err.url
        });

        this.handleLoginError(err.error?.message || 'Login failed. Please try again.');
      }
    });
  }

  // ✅ Handle login errors
  private handleLoginError(message: string): void {
    this.errorMessage = message;
    this.isLoading = false;

    const button: HTMLButtonElement | null = this.el.nativeElement.querySelector('button');
    if (button) {
      button.innerHTML = 'Login';
      button.disabled = false;
      this.renderer.removeStyle(button, 'background');
    }

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

  // ✅ Debug function to check current state
  debugState(): void {
    console.log('🐛 DEBUG STATE:', {
      formValid: this.loginForm.valid,
      formValues: this.loginForm.value,
      formErrors: this.loginForm.errors,
      localStorage: { ...localStorage },
      environment: environment
    });
  }
}
