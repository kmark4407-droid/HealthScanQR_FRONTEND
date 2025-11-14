import { Component, AfterViewInit, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../Environments/environment';

@Component({
  selector: 'app-update-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './update.html',
  styleUrls: ['./update.css']
})
export class UpdateInfoComponent implements AfterViewInit, OnInit {
  updateForm: FormGroup;
  selectedFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;
  showSuccess = false;
  showWarning = false;
  isSubmitting = false;
  showSettings = false;
  largeFontEnabled = false;
  private appContainer: HTMLElement | null = null;

  // Accessibility settings state
  dyslexiaFontEnabled = false;
  grayscaleEnabled = false;
  highContrastEnabled = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient
  ) {
    this.updateForm = this.fb.group({
      full_name: ['', Validators.required],
      dob: ['', Validators.required],
      blood_type: ['', Validators.required],
      address: ['', Validators.required],
      allergies: [''],
      medications: [''],
      conditions: [''],
      emergency_contact: ['', Validators.required],
      photo: [null, Validators.required]
    });
  }

  ngOnInit() {
    console.log('🔄 Update component initialized');
    console.log('🔑 User ID:', localStorage.getItem('user_id'));
    console.log('✅ hasUpdated:', localStorage.getItem('hasUpdated'));
    console.log('🌐 API URL:', environment.apiUrl);
    
    // ✅ Check if user already completed update
    const hasUpdated = localStorage.getItem('hasUpdated');
    if (hasUpdated === 'true') {
      console.log('✅ User already updated, redirecting to landing');
      this.router.navigate(['/landing']);
      return;
    }

    // ✅ User needs to fill the form, stay on update page
    console.log('📝 User needs to fill medical info, staying on update page');
    
    // Load saved accessibility settings
    this.loadAccessibilitySettings();
  }

  ngAfterViewInit() {
    this.appContainer = document.querySelector('.medical-app-container');
    this.applyAccessibilitySettings();
  }

  // Close settings when clicking outside or pressing escape
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const settingsPanel = document.querySelector('.settings-panel');
    const settingsButton = document.querySelector('.nav-item[title="Settings"]');
    
    if (this.showSettings && 
        settingsPanel && 
        !settingsPanel.contains(event.target as Node) &&
        settingsButton &&
        !settingsButton.contains(event.target as Node)) {
      this.toggleSettings();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePress() {
    if (this.showSettings) {
      this.toggleSettings();
    }
  }

  // ✅ FIXED: Scroll to top when dashboard is clicked
  goToDashboard() {
    console.log('📊 Dashboard clicked - scrolling to top');
    this.scrollToTop();
  }

  // ✅ NEW METHOD: Scroll to top of page
  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  toggleSettings() {
    this.showSettings = !this.showSettings;
    
    // Prevent body scroll when settings are open on mobile
    if (this.showSettings) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  // Enhanced accessibility toggle functions
  toggleDyslexiaFont(event: any) {
    this.dyslexiaFontEnabled = event.target.checked;
    this.applyAccessibilityClass('dyslexia-font', this.dyslexiaFontEnabled);
    this.saveAccessibilitySettings();
  }

  toggleLargeFont(event: any) {
    this.largeFontEnabled = event.target.checked;
    this.applyAccessibilityClass('large-font', this.largeFontEnabled);
    this.saveAccessibilitySettings();
  }

  toggleGrayscale(event: any) {
    this.grayscaleEnabled = event.target.checked;
    this.applyAccessibilityClass('grayscale-mode', this.grayscaleEnabled);
    this.saveAccessibilitySettings();
  }

  toggleHighContrast(event: any) {
    this.highContrastEnabled = event.target.checked;
    this.applyAccessibilityClass('high-contrast', this.highContrastEnabled);
    this.saveAccessibilitySettings();
  }

  private applyAccessibilityClass(className: string, enabled: boolean) {
    if (this.appContainer) {
      if (enabled) {
        this.appContainer.classList.add(className);
      } else {
        this.appContainer.classList.remove(className);
      }
    }
  }

  private saveAccessibilitySettings() {
    const settings = {
      dyslexia: this.dyslexiaFontEnabled,
      largeFont: this.largeFontEnabled,
      grayscale: this.grayscaleEnabled,
      highContrast: this.highContrastEnabled
    };
    localStorage.setItem('accessibilitySettings', JSON.stringify(settings));
  }

  private loadAccessibilitySettings() {
    const saved = localStorage.getItem('accessibilitySettings');
    if (saved) {
      const settings = JSON.parse(saved);
      this.dyslexiaFontEnabled = settings.dyslexia || false;
      this.largeFontEnabled = settings.largeFont || false;
      this.grayscaleEnabled = settings.grayscale || false;
      this.highContrastEnabled = settings.highContrast || false;
    }
  }

  private applyAccessibilitySettings() {
    if (this.appContainer) {
      this.applyAccessibilityClass('dyslexia-font', this.dyslexiaFontEnabled);
      this.applyAccessibilityClass('large-font', this.largeFontEnabled);
      this.applyAccessibilityClass('grayscale-mode', this.grayscaleEnabled);
      this.applyAccessibilityClass('high-contrast', this.highContrastEnabled);
    }
  }

  exitApp() {
    if (confirm('Are you sure you want to exit?')) {
      this.router.navigate(['/login']);
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.updateForm.patchValue({ photo: file });
      this.updateForm.get('photo')?.updateValueAndValidity();

      const reader = new FileReader();
      reader.onload = e => (this.previewUrl = (e.target as FileReader).result);
      reader.readAsDataURL(file);
      
      console.log('📸 File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
    }
  }

  // ✅ TEST METHOD: Check if backend is reachable
  testBackendConnection() {
    console.log('🧪 Testing backend connection...');
    this.http.get(`${environment.apiUrl}/medical/test`).subscribe({
      next: (res: any) => {
        console.log('✅ Backend test successful:', res);
        alert('✅ Backend connection is working!');
      },
      error: (err) => {
        console.error('❌ Backend test failed:', err);
        alert('❌ Cannot connect to backend. Please check if server is running.');
      }
    });
  }

  // ✅ TEST METHOD: Debug user ID
  debugUserId() {
    const user_id = localStorage.getItem('user_id');
    console.log('🔍 User ID Debug:', user_id);
    console.log('🔍 User ID type:', typeof user_id);
    console.log('🔍 Parsed user ID:', parseInt(user_id || '0'));
    
    if (user_id) {
      this.http.post(`${environment.apiUrl}/medical/debug-user-id`, { user_id }).subscribe({
        next: (res: any) => {
          console.log('✅ User ID debug result:', res);
          alert(`User ID Debug: ${JSON.stringify(res, null, 2)}`);
        },
        error: (err) => {
          console.error('❌ User ID debug failed:', err);
        }
      });
    } else {
      alert('❌ No user_id found in localStorage');
    }
  }

  submit() {
    console.log('🔄 Submit method called');
    console.log('🌐 API Base URL:', environment.apiUrl);
    
    if (this.updateForm.invalid) {
      console.log('❌ Form invalid - showing errors:');
      Object.keys(this.updateForm.controls).forEach(key => {
        const control = this.updateForm.get(key);
        if (control?.errors) {
          console.log(`  ${key}:`, control.errors);
        }
        if (control?.invalid) {
          console.log(`  ${key} is invalid, value:`, control.value);
        }
      });
      
      this.showWarning = true;
      Object.keys(this.updateForm.controls).forEach(key => {
        this.updateForm.get(key)?.markAsTouched();
      });
      
      this.scrollToFirstError();
      setTimeout(() => {
        this.showWarning = false;
      }, 5000);
      return;
    }

    console.log('✅ Form valid, proceeding with submission');
    this.showWarning = false;
    this.isSubmitting = true;
    
    const user_id = localStorage.getItem('user_id');
    console.log('🔑 User ID for submission:', user_id);
    console.log('🔑 User ID type:', typeof user_id);
    
    if (!user_id) {
      alert('⚠️ User not logged in properly. Please log in again.');
      this.router.navigate(['/login']);
      this.isSubmitting = false;
      return;
    }

    // Validate user_id is a number
    const parsedUserId = parseInt(user_id);
    if (isNaN(parsedUserId)) {
      alert('⚠️ Invalid user ID format. Please log in again.');
      this.router.navigate(['/login']);
      this.isSubmitting = false;
      return;
    }

    const formData = new FormData();
    formData.append('user_id', user_id);

    console.log('📝 Form values:', this.updateForm.value);
    
    // Add all form fields to FormData
    Object.keys(this.updateForm.value).forEach(key => {
      if (key !== 'photo') {
        const value = this.updateForm.value[key];
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
          console.log(`  ${key}:`, value);
        }
      }
    });

    if (this.selectedFile) {
      formData.append('photo', this.selectedFile);
      console.log('📸 File attached:', this.selectedFile.name, 'Size:', this.selectedFile.size);
    } else {
      console.log('❌ No file selected - this may cause validation issues');
    }

    // Log FormData contents for debugging
    console.log('📦 FormData entries:');
    for (let pair of (formData as any).entries()) {
      console.log(`  ${pair[0]}:`, pair[1]);
    }

    console.log('🌐 Making API call to:', `${environment.apiUrl}/medical/update`);
    
    this.http.post(`${environment.apiUrl}/medical/update`, formData).subscribe({
      next: (res: any) => {
        console.log('✅ Medical info saved successfully:', res);
        this.showSuccess = true;
        this.isSubmitting = false;

        // ✅ Mark user as having completed update
        localStorage.setItem('hasUpdated', 'true');

        setTimeout(() => {
          console.log('➡️ Redirecting to landing page');
          this.router.navigate(['/landing']);
        }, 1500);
      },
      error: (err) => {
        console.error('❌ DETAILED ERROR SAVING MEDICAL INFO:');
        console.error('Error object:', err);
        console.error('Error status:', err.status);
        console.error('Error status text:', err.statusText);
        console.error('Error message:', err.message);
        console.error('Error name:', err.name);
        console.error('Error response:', err.error);
        
        let errorMessage = 'Failed to save information. Please try again.';
        
        if (err.status === 0) {
          errorMessage = 'Cannot connect to server. Please check:\n• Your internet connection\n• If the backend server is running\n• CORS configuration';
        } else if (err.status === 400) {
          errorMessage = err.error?.message || 'Invalid data provided. Please check all fields.';
          if (err.error?.missing) {
            errorMessage += `\nMissing fields: ${err.error.missing.join(', ')}`;
          }
        } else if (err.status === 500) {
          errorMessage = err.error?.message || 'Server error. Please try again later.';
        } else if (err.status === 413) {
          errorMessage = 'File too large. Please select a smaller image.';
        }
        
        alert(`❌ ${errorMessage}`);
        this.isSubmitting = false;
      },
      complete: () => {
        console.log('✅ API call completed');
      }
    });
  }

  private scrollToFirstError() {
    const firstErrorElement = document.querySelector('.error-message');
    if (firstErrorElement) {
      firstErrorElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  // ✅ Skip update and go directly to landing
  skipUpdate() {
    console.log('⏭️ Skip update called');
    if (confirm('Are you sure you want to skip medical info setup? You can add it later from your profile.')) {
      localStorage.setItem('hasUpdated', 'true');
      this.router.navigate(['/landing']);
    }
  }

  // ✅ Method to check form validation state
  checkFormValidity() {
    console.log('🔍 Form validation check:');
    console.log('Form valid:', this.updateForm.valid);
    console.log('Form invalid:', this.updateForm.invalid);
    console.log('Form pristine:', this.updateForm.pristine);
    console.log('Form dirty:', this.updateForm.dirty);
    console.log('Form touched:', this.updateForm.touched);
    
    Object.keys(this.updateForm.controls).forEach(key => {
      const control = this.updateForm.get(key);
      console.log(`${key}:`, {
        valid: control?.valid,
        invalid: control?.invalid,
        errors: control?.errors,
        value: control?.value,
        touched: control?.touched,
        dirty: control?.dirty
      });
    });
  }
}
