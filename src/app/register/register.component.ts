import { Component, ElementRef, Renderer2, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common'; 
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,     
    ReactiveFormsModule,
    HttpClientModule
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  showPassword = false;
  showTermsCard = false;
  showPrivacyCard = false;
  errorMessage = '';
  isLoading = false;
  showVerificationMessage = false;
  registeredEmail = '';
  successMessage = '';
  showTestingButtons = true; // Set to false in production

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private el: ElementRef,
    private renderer: Renderer2,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      full_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)]],
      acceptTerms: [false, Validators.requiredTrue]
    });
  }

  ngOnInit(): void {
    // Add focus/blur animation for inputs
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
  }

  getPasswordStrength(): number {
    const password = this.registerForm.get('password')?.value || '';
    let strength = 0;
    
    if (this.hasMinLength()) strength += 20;
    if (this.hasLowerCase()) strength += 20;
    if (this.hasUpperCase()) strength += 20;
    if (this.hasNumber()) strength += 20;
    if (this.hasSpecialChar()) strength += 20;
    
    return Math.min(strength, 100);
  }

  getPasswordStrengthText(): string {
    const strength = this.getPasswordStrength();
    if (strength === 0) return '';
    if (strength <= 25) return 'Weak';
    if (strength <= 50) return 'Fair';
    if (strength <= 75) return 'Good';
    return 'Strong';
  }

  getPasswordStrengthColor(): string {
    const strength = this.getPasswordStrength();
    if (strength <= 25) return '#e74c3c';
    if (strength <= 50) return '#f39c12';
    if (strength <= 75) return '#3498db';
    return '#2ecc71';
  }

  // Password validation methods
  hasMinLength(): boolean {
    const password = this.registerForm.get('password')?.value || '';
    return password.length >= 8;
  }

  hasLowerCase(): boolean {
    const password = this.registerForm.get('password')?.value || '';
    return /[a-z]/.test(password);
  }

  hasUpperCase(): boolean {
    const password = this.registerForm.get('password')?.value || '';
    return /[A-Z]/.test(password);
  }

  hasNumber(): boolean {
    const password = this.registerForm.get('password')?.value || '';
    return /\d/.test(password);
  }

  hasSpecialChar(): boolean {
    const password = this.registerForm.get('password')?.value || '';
    return /[@$!%*?&]/.test(password);
  }

  submit(): void {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched();
      
      // Highlight invalid inputs
      Object.keys(this.registerForm.controls).forEach(field => {
        const control = this.registerForm.get(field);
        const input: HTMLElement | null = this.el.nativeElement.querySelector(`[formControlName="${field}"]`);
        if (control && control.invalid && input) {
          this.renderer.setStyle(input, 'borderColor', '#e74c3c');
        }
      });
      return;
    }

    const button: HTMLButtonElement | null = this.el.nativeElement.querySelector('button[type="submit"]');
    if (button) {
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
      button.disabled = true;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.showVerificationMessage = false;
    this.successMessage = '';

    this.auth.register(this.registerForm.value).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        console.log('✅ Registration successful:', res);

        if (button) {
          button.innerHTML = '<i class="fas fa-check"></i> Account Created!';
          this.renderer.setStyle(button, 'background', '#2ecc71');
        }

        // Show verification message
        this.showVerificationMessage = true;
        this.registeredEmail = this.registerForm.get('email')?.value;

        if (res.emailSent) {
          this.successMessage = 'Registration successful! Please check your email for verification link.';
        } else {
          this.successMessage = 'Registration completed but email verification failed. Please use resend verification.';
        }

        // Clear form
        this.registerForm.reset();

        setTimeout(() => {
          if (button) {
            button.innerHTML = 'Register';
            button.disabled = false;
            this.renderer.removeStyle(button, 'background');
          }
        }, 3000);

      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('❌ Registration failed:', error);

        if (button) {
          button.innerHTML = 'Register';
          button.disabled = false;
          this.renderer.removeStyle(button, 'background');
        }

        this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
        
        if (error.status === 409) {
          this.errorMessage = 'Email or username already exists. Please use different credentials.';
        } else if (error.status === 400) {
          this.errorMessage = 'Invalid registration data. Please check your information.';
        } else if (error.status === 500) {
          this.errorMessage = 'Server error. Please try again later.';
        }
      }
    });
  }

  // RESEND VERIFICATION EMAIL
  resendVerification(): void {
    if (this.registeredEmail) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      this.auth.resendVerificationEmail(this.registeredEmail).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          console.log('✅ Verification email resent:', res);
          if (res.success && res.emailSent) {
            this.successMessage = 'Verification email sent successfully! Please check your inbox.';
          } else {
            this.errorMessage = 'Failed to send verification email. Please try quick verify instead.';
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          console.error('❌ Failed to resend verification:', error);
          this.errorMessage = 'Failed to resend verification email. Please try quick verify instead.';
        }
      });
    }
  }

  // MANUAL SYNC VERIFICATION (for testing)
  manualSyncVerification(): void {
    if (this.registeredEmail) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      this.auth.manualSyncVerification(this.registeredEmail).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          console.log('✅ Manual sync successful:', res);
          this.successMessage = 'Email verified successfully! You can now login.';
          
          // Redirect to login after successful sync
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (error: any) => {
          this.isLoading = false;
          console.error('❌ Manual sync failed:', error);
          this.errorMessage = 'Manual sync failed. Please try quick verify instead.';
        }
      });
    }
  }

  // QUICK VERIFY (instant verification for testing)
  quickVerify(): void {
    if (this.registeredEmail) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      this.auth.quickVerifyEmail(this.registeredEmail).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          console.log('✅ Quick verify successful:', res);
          this.successMessage = 'Email verified instantly! You can now login.';
          
          // Redirect to login after successful verification
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (error: any) => {
          this.isLoading = false;
          console.error('❌ Quick verify failed:', error);
          this.errorMessage = 'Quick verify failed. Please try manual sync.';
        }
      });
    }
  }

  // CHECK VERIFICATION STATUS
  checkVerificationStatus(): void {
    if (this.registeredEmail) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      this.auth.checkVerificationStatus(this.registeredEmail).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          console.log('✅ Verification status:', res);
          
          if (res.emailVerified) {
            this.successMessage = 'Email is verified! You can now login.';
            
            // Redirect to login if verified
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          } else {
            this.errorMessage = 'Email is not verified yet. Please check your email or use resend.';
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          console.error('❌ Status check failed:', error);
          this.errorMessage = 'Failed to check verification status.';
        }
      });
    }
  }

  // Go to login page
  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  // Close verification message
  closeVerificationMessage(): void {
    this.showVerificationMessage = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  private markFormGroupTouched() {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }
}
