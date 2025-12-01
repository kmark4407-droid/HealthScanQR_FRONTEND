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
  showError = false;
  errorMessage = '';
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
    console.log('🌐 API URL:', environment.apiUrl);
    
    // ✅ Check if user already completed update
    const hasUpdated = localStorage.getItem('hasUpdated');
    if (hasUpdated === 'true') {
      console.log('✅ User already updated, redirecting to landing');
      this.router.navigate(['/landing']);
      return;
    }

    // ✅ Check if user is logged in
    const user_id = localStorage.getItem('user_id');
    const token = localStorage.getItem('token');
    
    if (!user_id || !token) {
      console.log('❌ User not logged in, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }
    
    console.log('🔑 User ID from localStorage:', user_id);
    console.log('🔐 Token present:', !!token);

    // ✅ User needs to fill the form, stay on update page
    console.log('📝 User needs to fill medical info, staying on update page');
    
    // Load saved accessibility settings
    this.loadAccessibilitySettings();
    
    // Pre-fill with any existing data
    this.prefillForm();
  }

  ngAfterViewInit() {
    this.appContainer = document.querySelector('.medical-app-container');
    this.applyAccessibilitySettings();
  }

  private prefillForm() {
    // Try to load any previously saved form data
    const savedData = localStorage.getItem('medicalFormDraft');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        this.updateForm.patchValue(data);
        console.log('📋 Loaded saved form draft');
      } catch (e) {
        console.log('❌ Could not load saved form draft');
      }
    }
  }

  // Save form draft when user leaves page
  @HostListener('window:beforeunload')
  saveDraftOnLeave() {
    if (this.updateForm.dirty && !this.isSubmitting) {
      localStorage.setItem('medicalFormDraft', JSON.stringify(this.updateForm.value));
    }
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
    this.closeMobileMenu();
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
    this.closeMobileMenu();
  }

  // ✅ NEW METHOD: Close mobile menu
  closeMobileMenu() {
    if (this.mobileMenuOpen) {
      this.toggleMobileMenu();
    }
  }

  toggleSettings() {
    this.showSettings = !this.showSettings;
    this.closeMobileMenu();
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
      try {
        const settings = JSON.parse(saved);
        this.dyslexiaFontEnabled = settings.dyslexia || false;
        this.largeFontEnabled = settings.largeFont || false;
        this.grayscaleEnabled = settings.grayscale || false;
        this.highContrastEnabled = settings.highContrast || false;
      } catch (e) {
        console.log('❌ Error loading accessibility settings:', e);
      }
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
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        this.showErrorWithMessage('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        event.target.value = ''; // Clear the file input
        return;
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        this.showErrorWithMessage('Image size must be less than 5MB');
        event.target.value = ''; // Clear the file input
        return;
      }

      this.selectedFile = file;
      this.updateForm.patchValue({ photo: file });
      this.updateForm.get('photo')?.updateValueAndValidity();

      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = (e.target as FileReader).result;
        console.log('📸 File selected and preview generated:', {
          name: file.name,
          size: file.size,
          type: file.type
        });
      };
      reader.readAsDataURL(file);
      
    } else {
      this.selectedFile = null;
      this.previewUrl = null;
      this.updateForm.patchValue({ photo: null });
    }
  }

  // Helper method to show error
  private showErrorWithMessage(message: string) {
    this.errorMessage = message;
    this.showError = true;
    this.showWarning = false;
    this.showSuccess = false;
    
    setTimeout(() => {
      this.showError = false;
    }, 5000);
  }

  // ✅ ENHANCED: Submit method with better error handling
  submit() {
    console.log('🔄 Submit method called');
    console.log('🌐 API Base URL:', environment.apiUrl);
    
    // Reset all messages
    this.showError = false;
    this.showWarning = false;
    this.showSuccess = false;
    this.errorMessage = '';
    
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
    
    // Get user data from localStorage
    const user_id = localStorage.getItem('user_id');
    const token = localStorage.getItem('token');
    
    console.log('🔑 User ID for submission:', user_id);
    console.log('🔐 Token present:', !!token);
    
    if (!user_id || !token) {
      this.showErrorWithMessage('⚠️ User not logged in properly. Please log in again.');
      this.isSubmitting = false;
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
      return;
    }

    // Validate user_id is a number
    const parsedUserId = parseInt(user_id);
    if (isNaN(parsedUserId)) {
      this.showErrorWithMessage('⚠️ Invalid user ID format. Please log in again.');
      this.isSubmitting = false;
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
      return;
    }

    // Create FormData
    const formData = new FormData();
    formData.append('user_id', user_id);

    console.log('📝 Form values:', this.updateForm.value);
    
    // Add all form fields to FormData
    Object.keys(this.updateForm.value).forEach(key => {
      if (key !== 'photo') {
        const value = this.updateForm.value[key];
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value.toString().trim());
        }
      }
    });

    // Add file if selected
    if (this.selectedFile) {
      formData.append('photo', this.selectedFile, this.selectedFile.name);
      console.log('📸 File attached:', {
        name: this.selectedFile.name,
        size: this.selectedFile.size,
        type: this.selectedFile.type
      });
    } else {
      console.log('⚠️ No file selected - but form requires photo');
      this.showErrorWithMessage('Please select a profile photo');
      this.isSubmitting = false;
      return;
    }

    // Log FormData contents (for debugging)
    console.log('📦 FormData entries:');
    for (let pair of (formData as any).entries()) {
      console.log(`  ${pair[0]}:`, pair[1]);
    }

    console.log('🌐 Making API call to:', `${environment.apiUrl}/medical/update`);
    
    // Make the API call with timeout and better error handling
    this.http.post(`${environment.apiUrl}/medical/update`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 30000 // 30 second timeout for mobile
    }).subscribe({
      next: (res: any) => {
        console.log('✅ Medical info saved successfully:', res);
        this.showSuccess = true;
        this.isSubmitting = false;

        // Clear draft data
        localStorage.removeItem('medicalFormDraft');
        
        // ✅ Mark user as having completed update
        localStorage.setItem('hasUpdated', 'true');
        
        // ✅ Store the form data in localStorage as backup
        localStorage.setItem('medicalFormData', JSON.stringify(this.updateForm.value));
        
        // ✅ Store timestamp for last updated
        localStorage.setItem('medicalInfoLastUpdated', new Date().toISOString());

        console.log('🎉 Success! Redirecting to landing page in 1.5 seconds...');
        
        setTimeout(() => {
          console.log('➡️ Redirecting to landing page');
          this.router.navigate(['/landing']);
        }, 1500);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Submission error:', err);
        
        let errorMessage = 'Failed to save medical information. Please try again.';
        
        if (err.status === 0) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (err.status === 400) {
          if (err.error?.message) {
            errorMessage = err.error.message;
          } else {
            errorMessage = 'Invalid data submitted. Please check all fields.';
          }
        } else if (err.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else if (err.status === 413) {
          errorMessage = 'Image file is too large. Please use an image smaller than 5MB.';
        } else if (err.status === 415) {
          errorMessage = 'Invalid file type. Please use JPEG, PNG, GIF, or WebP.';
        } else if (err.error?.message) {
          errorMessage = err.error.message;
        }
        
        this.showErrorWithMessage(errorMessage);
        this.isSubmitting = false;
        
        // Log detailed error for debugging
        console.error('🔍 Error details:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          error: err.error
        });
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
    } else {
      // Scroll to top if no error messages visible
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }
}
