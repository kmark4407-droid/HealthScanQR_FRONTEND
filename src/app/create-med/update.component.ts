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
    console.log('🔄 Update component initialized - DEBUG MODE');
    console.log('📍 Current URL:', window.location.href);
    console.log('🔑 User ID in localStorage:', localStorage.getItem('user_id'));
    console.log('✅ hasUpdated flag:', localStorage.getItem('hasUpdated'));
    
    // ✅ TEMPORARY: Skip all checks and go directly to landing for testing
    console.log('🚨 TEMPORARY: Skipping to landing page for testing');
    localStorage.setItem('hasUpdated', 'true');
    this.router.navigate(['/landing']);
    return;
    
    // Comment out the above 3 lines after testing
    
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

  goToDashboard() {
    this.router.navigate(['/dashboard']);
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
    }
  }

  submit() {
    console.log('🔄 Submit method called');
    
    if (this.updateForm.invalid) {
      console.log('❌ Form invalid');
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
    
    if (!user_id) {
      alert('⚠️ User not logged in properly.');
      this.router.navigate(['/login']);
      this.isSubmitting = false;
      return;
    }

    const formData = new FormData();
    formData.append('user_id', user_id);

    console.log('📝 Form values:', this.updateForm.value);
    
    Object.keys(this.updateForm.value).forEach(key => {
      if (key !== 'photo') {
        const value = this.updateForm.value[key];
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
          console.log(`📦 Added to formData: ${key} = ${value}`);
        }
      }
    });

    if (this.selectedFile) {
      formData.append('photo', this.selectedFile);
      console.log('📸 Photo added to formData');
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
        console.error('❌ ERROR saving medical info - FULL DETAILS:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          error: err.error,
          url: err.url,
          headers: err.headers
        });
        
        alert(`❌ Failed to save information. Check console for details.`);
        this.isSubmitting = false;
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
    if (confirm('Skip medical info setup?')) {
      localStorage.setItem('hasUpdated', 'true');
      this.router.navigate(['/landing']);
    }
  }
}
