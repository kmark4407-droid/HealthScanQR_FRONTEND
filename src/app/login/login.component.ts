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
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      button.disabled = true;
    }

    this.errorMessage = '';

    this.auth.login(this.loginForm.value).subscribe({
      next: (res) => {
        if (button) {
          button.innerHTML = '<i class="fas fa-check"></i> Success!';
          this.renderer.setStyle(button, 'background', '#2ecc71');
        }

        localStorage.setItem('loggedIn', 'true');
        localStorage.setItem('token', res.token);
        localStorage.setItem('user_id', res.user?.id);

        const userId = res.user?.id;

        if (!userId) {
          console.warn('No user ID found, staying on login.');
          return;
        }

        // ✅ Check if user already has medical info
        this.http.get(`${environment.apiUrl}/medical/${userId}`).subscribe({
          next: (medicalRes: any) => {
            if (medicalRes && Object.keys(medicalRes).length > 0) {
              console.log('Medical info exists, redirecting to landing...');
              localStorage.setItem('hasUpdated', 'true'); // ✅ Save update flag
              this.router.navigateByUrl('/landing');
            } else {
              console.log('No medical info, redirecting to update-info...');
              localStorage.setItem('hasUpdated', 'false'); // ✅ Mark not updated
              this.router.navigateByUrl('/update-info');
            }
          },
          error: (err) => {
            console.error('Error checking medical info:', err);
            alert('Error checking medical info. Please try again.');
          }
        });
      },
      error: (err) => {
        if (button) {
          button.innerHTML = 'Login';
          button.disabled = false;
          this.renderer.removeStyle(button, 'background');
        }

        this.errorMessage = err.error?.message || 'Login failed. Please try again.';
        console.error('Login error:', err);
      }
    });
  } 
}
