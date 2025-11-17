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

    this.auth.register(this.registerForm.value).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        console.log('✅ Registration successful:', res);

        if (button) {
          button.innerHTML = '<i class="fas fa-check"></i> Account Created!';
          this.renderer.setStyle(button, 'background', '#2ecc71');
        }

        // Show verification message instead of redirecting
        this.showVerificationMessage = true;
        this.registeredEmail = this.registerForm.get('email')?.value;

        // Clear form
        this.registerForm.reset();

        // Don't redirect immediately - let user see verification message
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

  // TEMPORARILY COMMENTED OUT - Will add back after AuthService is updated
  // resendVerification(): void {
  //   if (this.registeredEmail) {
  //     this.auth.resendVerificationEmail(this.registeredEmail).subscribe({
  //       next: (res: any) => {
  //         console.log('✅ Verification email resent');
  //         this.errorMessage = ''; // Clear any previous errors
  //       },
  //       error: (error: any) => {
  //         console.error('❌ Failed to resend verification:', error);
  //         this.errorMessage = 'Failed to resend verification email. Please try again.';
  //       }
  //     });
  //   }
  // }

  // Go to login page
  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  private markFormGroupTouched() {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }
}
