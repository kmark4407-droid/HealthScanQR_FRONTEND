import { Component, ElementRef, Renderer2, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common'; 

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

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private el: ElementRef,
    private renderer: Renderer2
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
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    if (passwordInput) {
      passwordInput.type = this.showPassword ? 'text' : 'password';
    }
  }

  getPasswordStrength(): number {
    const password = this.registerForm.get('password')?.value || '';
    let strength = 0;
    
    if (this.hasMinLength()) strength += 25;
    if (this.hasLowerCase()) strength += 25;
    if (this.hasUpperCase()) strength += 25;
    if (this.hasNumber()) strength += 25;
    if (this.hasSpecialChar()) strength += 25;
    
    return Math.min(strength, 100); // Cap at 100%
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

    const button: HTMLButtonElement | null = this.el.nativeElement.querySelector('button');
    if (button) {
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      button.disabled = true;
    }

    this.auth.register(this.registerForm.value).subscribe({
      next: res => {
        if (button) {
          button.innerHTML = '<i class="fas fa-check"></i> Success!';
          this.renderer.setStyle(button, 'background', '#2ecc71');
        }

        setTimeout(() => {
          if (button) {
            button.innerHTML = 'Register';
            button.disabled = false;
            this.renderer.removeStyle(button, 'background');
          }
          this.registerForm.reset();
          alert('✅ Registered successfully!');
        }, 2000);

        console.log(res);
      },
      error: err => {
        if (button) {
          button.innerHTML = 'Register';
          button.disabled = false;
          this.renderer.removeStyle(button, 'background');
        }
        alert('❌ Registration failed: ' + (err.error?.error || err.message));
        console.error(err);
      }
    });
  }
}