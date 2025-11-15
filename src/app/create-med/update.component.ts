import { Component, AfterViewInit, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
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
  mobileMenuOpen = false;
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

  // SIMPLIFIED: Toggle mobile menu
  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    
    // Toggle body scroll
    if (this.mobileMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
  }

  // Enhanced click outside handler
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const sidebarContent = document.querySelector('.sidebar-content');
    const hamburgerButton = document.querySelector('.hamburger-menu');
    
    // Close mobile menu when clicking outside
    if (this.mobileMenuOpen && 
        sidebarContent && 
        !sidebarContent.contains(event.target as Node) &&
        hamburgerButton &&
        !hamburgerButton.contains(event.target as Node)) {
      this.toggleMobileMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePress() {
    if (this.showSettings) {
      this.toggleSettings();
    }
    if (this.mobileMenuOpen) {
      this.toggleMobileMenu();
    }
  }

  // ✅ FIXED: Scroll to top when dashboard is clicked
  goToDashboard() {
    console.log('📊 Dashboard clicked - scrolling to top');
    this.scrollToTop();
    this.toggleMobileMenu();
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
    this.toggleMobileMenu();
  }

  toggleSettings() {
    this.showSettings = !this.showSettings;
    this.toggleMobileMenu();
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

  // ✅ IMPROVED: Submit method with better error handling
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
        }
      }
    });

    if (this.selectedFile) {
      formData.append('photo', this.selectedFile);
      console.log('📸 File attached:', this.selectedFile.name);
    } else {
      console.log('⚠️ No file selected - form requires photo');
    }

    console.log('🌐 Making API call to:', `${environment.apiUrl}/medical/update`);
    
    this.http.post(`${environment.apiUrl}/medical/update`, formData).subscribe({
      next: (res: any) => {
        console.log('✅ Medical info saved successfully:', res);
        this.showSuccess = true;
        this.isSubmitting = false;

        // ✅ Mark user as having completed update
        localStorage.setItem('hasUpdated', 'true');
        
        // ✅ Also store the form data in localStorage as backup
        localStorage.setItem('medicalFormData', JSON.stringify(this.updateForm.value));
        
        // ✅ Store timestamp for last updated
        localStorage.setItem('medicalInfoLastUpdated', new Date().toISOString());

        setTimeout(() => {
          console.log('➡️ Redirecting to landing page');
          this.router.navigate(['/landing']);
        }, 1500);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Submission error:', err);
        alert('❌ Failed to save medical information. Please try again.');
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
}
