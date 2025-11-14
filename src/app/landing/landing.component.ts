import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import QRCode from 'qrcode';
import { CommonModule } from '@angular/common';
import { environment } from '../../Environments/environment';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './landing.html',
  styleUrls: ['./landing.css']
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('generatedQR') generatedQR!: ElementRef;
  @ViewChild('profilePreview') profilePreview!: ElementRef;

  medicalForm: FormGroup;
  qrCodeUrl: string = '';

  // Profile photo variables
  selectedProfileFile: File | null = null;
  profilePreviewUrl: string | ArrayBuffer | null = null;
  profilePhotoUrl: string = '';

  // Last updated timestamp
  lastUpdated: string = 'Never';

  // Add formatted date property
  formattedDob: string = '';

  // User name for welcome message
  userName: string = 'User';

  // Auto-refresh interval
  private autoRefreshInterval: any;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.medicalForm = this.fb.group({
      full_name: ['', Validators.required],
      dob: ['', [Validators.required, this.dateValidator]],
      blood_type: ['', Validators.required],
      address: ['', Validators.required],
      allergies: [''],
      medications: [''],
      conditions: [''],
      emergency_contact: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    console.log('🏠 Landing component initialized');
    
    // ✅ CHECK IF USER SHOULD BE ON LANDING PAGE
    this.checkAccess();
    
    // Auto-refresh data every 30 seconds to catch admin updates
    this.autoRefreshInterval = setInterval(() => {
      this.refreshMedicalData();
    }, 30000);
  }

  // ✅ NEW METHOD: Check if user should be on landing page
  private checkAccess(): void {
    const userId = localStorage.getItem('user_id');
    const hasUpdated = localStorage.getItem('hasUpdated');
    
    console.log('🔍 Landing access check:', { userId, hasUpdated });

    if (!userId) {
      console.log('❌ No user ID, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    if (hasUpdated !== 'true') {
      console.log('📝 User not updated yet, redirecting to update-info');
      this.router.navigate(['/update-info']);
      return;
    }

    console.log('✅ User has updated, loading medical data');
    this.loadMedicalData();
  }

  ngOnDestroy(): void {
    // Clear interval when component is destroyed
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
  }

  loadMedicalData(): void {
    const userId = localStorage.getItem('user_id');
    if (userId) {
      console.log('🔍 Loading medical data for user:', userId);
      
      this.http.get(`${environment.apiUrl}/medical/${userId}?t=${new Date().getTime()}`).subscribe({
        next: (res: any) => {
          console.log('📦 Medical API response:', res);
          
          // ✅ REVISED: Handle both cases: data exists or doesn't exist
          if (res && res.exists) {
            console.log('✅ Medical data found:', res);
            
            // ✅ IMPROVED: Patch all form data properly
            this.medicalForm.patchValue({
              full_name: res.full_name || '',
              dob: res.dob || '',
              blood_type: res.blood_type || '',
              address: res.address || '',
              allergies: res.allergies || '',
              medications: res.medications || '',
              conditions: res.conditions || '',
              emergency_contact: res.emergency_contact || ''
            });

            // Handle date properly to prevent timezone shifting
            if (res.dob) {
              const normalized = this.normalizeDateString(res.dob);
              this.medicalForm.patchValue({ dob: normalized });
              this.formattedDob = this.formatDateForDisplay(normalized);
            }

            // Update user name for welcome message
            if (res.full_name) {
              this.userName = res.full_name;
            }

            // ✅ SIMPLIFIED: Handle base64 images directly from database
            if (res.photo_url && res.photo_url.startsWith('data:')) {
              console.log('📸 Base64 profile image found');
              this.profilePhotoUrl = res.photo_url;
              
              // Update profile preview image
              setTimeout(() => {
                if (this.profilePreview) {
                  const img = this.profilePreview.nativeElement;
                  img.src = this.profilePhotoUrl;
                  img.onerror = () => {
                    console.error('❌ Failed to load base64 profile image');
                    // Use embedded SVG fallback
                    img.src = this.getDefaultAvatar();
                  };
                  img.onload = () => {
                    console.log('✅ Base64 profile image loaded successfully');
                  };
                }
              }, 100);
            } else if (res.photo_url) {
              console.log('📸 External profile photo URL (legacy):', res.photo_url);
              this.profilePhotoUrl = res.photo_url;
              
              setTimeout(() => {
                if (this.profilePreview) {
                  const img = this.profilePreview.nativeElement;
                  img.src = this.profilePhotoUrl;
                  img.onerror = () => {
                    console.error('❌ Failed to load external profile image:', this.profilePhotoUrl);
                    // Use embedded SVG fallback
                    img.src = this.getDefaultAvatar();
                  };
                }
              }, 100);
            } else {
              console.log('❌ No photo_url in response');
              // Use embedded SVG fallback
              this.profilePhotoUrl = this.getDefaultAvatar();
              if (this.profilePreview) {
                this.profilePreview.nativeElement.src = this.profilePhotoUrl;
              }
            }

            // Handle lastUpdated timestamp
            this.handleLastUpdatedTimestamp(res);
            
            this.generateQRCode();
          } else {
            // ✅ REVISED: No medical data exists yet
            console.log('❌ No medical data found for user');
            this.userName = 'User';
            this.lastUpdated = 'Never';
            
            // Set default profile image
            this.profilePhotoUrl = this.getDefaultAvatar();
            if (this.profilePreview) {
              this.profilePreview.nativeElement.src = this.profilePhotoUrl;
            }
            
            // Try to load from localStorage as fallback
            this.loadFromLocalStorage();
          }
        },
        error: (err) => {
          console.error('❌ Error fetching medical info:', err);
          console.log('🔧 Error details:', err.status, err.message);
          
          // Set default profile image on error
          this.profilePhotoUrl = this.getDefaultAvatar();
          if (this.profilePreview) {
            this.profilePreview.nativeElement.src = this.profilePhotoUrl;
          }
          
          // On error, try to use stored data from localStorage
          this.loadFromLocalStorage();
        }
      });
    } else {
      console.log('❌ No user ID found');
      // Set default profile image
      this.profilePhotoUrl = this.getDefaultAvatar();
      if (this.profilePreview) {
        this.profilePreview.nativeElement.src = this.profilePhotoUrl;
      }
      this.loadFromLocalStorage();
    }
  }

  // ✅ Get default avatar (embedded SVG - no external dependencies)
  private getDefaultAvatar(): string {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSI0MCIgZmlsbD0iI2RkZGRkZCIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjU1IiByPSIyNSIgZmlsbD0iI2RkZGRkZCIvPjx0ZXh0IHg9IjEwMCIgeT0iMTQwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5YzljOWMiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIFBob3RvPC90ZXh0Pjwvc3ZnPg==';
  }

  // ✅ IMPROVED: Load data from localStorage as fallback
  private loadFromLocalStorage(): void {
    console.log('📝 Loading from localStorage fallback');
    
    // Try to get stored medical data from form submission
    const storedFormData = localStorage.getItem('medicalFormData');
    if (storedFormData) {
      try {
        const data = JSON.parse(storedFormData);
        console.log('📦 Loaded data from localStorage:', data);
        
        this.medicalForm.patchValue({
          full_name: data.full_name || '',
          dob: data.dob || '',
          blood_type: data.blood_type || '',
          address: data.address || '',
          allergies: data.allergies || '',
          medications: data.medications || '',
          conditions: data.conditions || '',
          emergency_contact: data.emergency_contact || ''
        });
        
        if (data.dob) {
          this.formattedDob = this.formatDateForDisplay(data.dob);
        }
        
        if (data.full_name) {
          this.userName = data.full_name;
        }
        
        this.lastUpdated = localStorage.getItem('medicalInfoLastUpdated') || 'Never';
        console.log('✅ Loaded data from localStorage successfully');
      } catch (e) {
        console.error('❌ Error parsing localStorage data:', e);
      }
    } else {
      // No data available
      console.log('❌ No medical data available in localStorage');
      this.userName = 'User';
      this.lastUpdated = 'Never';
    }
    
    this.generateQRCode();
  }

  // Handle lastUpdated timestamp from various possible fields
  handleLastUpdatedTimestamp(data: any): void {
    const possibleTimestampFields = [
      'lastUpdated',
      'last_updated', 
      'updated_at',
      'updatedAt',
      'timestamp',
      'lastModified',
      'created_at'
    ];
    
    let foundTimestamp = null;
    
    for (const field of possibleTimestampFields) {
      if (data[field] && data[field] !== 'Never') {
        foundTimestamp = data[field];
        break;
      }
    }
    
    if (foundTimestamp) {
      // Validate the timestamp
      const date = new Date(foundTimestamp);
      if (!isNaN(date.getTime())) {
        this.lastUpdated = foundTimestamp;
        localStorage.setItem('medicalInfoLastUpdated', this.lastUpdated);
        console.log('✅ Found valid timestamp:', this.lastUpdated);
      } else {
        console.warn('⚠️ Invalid timestamp found:', foundTimestamp);
        this.lastUpdated = 'Never';
      }
    } else {
      console.log('📝 No timestamp found in response, checking localStorage...');
      // No timestamp in response, check localStorage
      const storedTimestamp = localStorage.getItem('medicalInfoLastUpdated');
      if (storedTimestamp) {
        this.lastUpdated = storedTimestamp;
      } else {
        this.lastUpdated = 'Never';
      }
    }
  }

  refreshMedicalData(): void {
    const userId = localStorage.getItem('user_id');
    if (userId) {
      this.http.get(`${environment.apiUrl}/medical/${userId}?t=${new Date().getTime()}`).subscribe({
        next: (res: any) => {
          console.log('🔄 Medical data refresh response:', res);
          
          // ✅ REVISED: Handle the new response format
          if (res && res.exists) {
            this.medicalForm.patchValue({
              full_name: res.full_name || '',
              dob: res.dob || '',
              blood_type: res.blood_type || '',
              address: res.address || '',
              allergies: res.allergies || '',
              medications: res.medications || '',
              conditions: res.conditions || '',
              emergency_contact: res.emergency_contact || ''
            });

            if (res.dob) {
              const normalized = this.normalizeDateString(res.dob);
              this.medicalForm.patchValue({ dob: normalized });
              this.formattedDob = this.formatDateForDisplay(normalized);
            }

            // Update user name for welcome message
            if (res.full_name) {
              this.userName = res.full_name;
            }

            // ✅ FIXED: Update profile photo using base64 from backend
            if (res.photo_url) {
              console.log('🔄 Updated profile photo URL:', res.photo_url.substring(0, 50) + '...');
              this.profilePhotoUrl = res.photo_url;
              if (this.profilePreview) {
                this.profilePreview.nativeElement.src = this.profilePhotoUrl;
              }
            }

            // Update timestamp when server provides data
            this.handleLastUpdatedTimestamp(res);

            this.generateQRCode();
          }
        },
        error: (err) => {
          console.error('❌ Error refreshing medical data:', err);
        }
      });
    }
  }

  // === DOB Fix Functions ===
  normalizeDateString(dateString: string): string {
    // Handles both ISO strings and plain YYYY-MM-DD
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  // Add method to format date as Month/Day/Year
  formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const month = (date.getMonth() + 1).toString();
      const day = date.getDate().toString();
      const year = date.getFullYear().toString();
      
      return `${month}/${day}/${year}`;
    } catch (e) {
      return dateString;
    }
  }

  // Date validator to ensure proper format
  dateValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(value);
    return valid ? null : { invalidDate: true };
  }

  ngAfterViewInit(): void {
    // Generate QR code after view init
    setTimeout(() => {
      this.generateQRCode();
    }, 1000);
  }

  async generateQRCode(): Promise<void> {
    try {
      // Get user_id from localStorage
      const userId = localStorage.getItem('user_id') || '';

      // Create minimal data object with only user identifier
      const data = {
        user_id: userId,
        full_name: this.medicalForm.get('full_name')?.value || '',
      };
      
      const dataString = JSON.stringify(data);
      const canvas = this.generatedQR.nativeElement;
      
      // Clear the canvas first
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      QRCode.toCanvas(canvas, dataString, {
        width: 200,
        margin: 1,
        color: {
          dark: '#2563eb',
          light: '#ffffff'
        }
      });
      
      console.log('✅ QR code generated successfully');
    } catch (err) {
      console.error('❌ QR code generation failed:', err);
    }
  }

  // Updated method to save QR code with text below
  saveQRCodeAsImage(): void {
    try {
      const qrCanvas = this.generatedQR.nativeElement;
      
      // Create a larger canvas to include text below QR code
      const finalCanvas = document.createElement('canvas');
      const finalCtx = finalCanvas.getContext('2d');
      
      if (!finalCtx) {
        throw new Error('Could not get canvas context');
      }

      // Set final canvas dimensions (QR code + space for text)
      const qrSize = qrCanvas.width;
      const textHeight = 60; // Space for text below QR code
      finalCanvas.width = qrSize;
      finalCanvas.height = qrSize + textHeight;

      // Fill background with white
      finalCtx.fillStyle = '#ffffff';
      finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      // Draw QR code at the top
      finalCtx.drawImage(qrCanvas, 0, 0);

      // Add text below QR code
      finalCtx.fillStyle = '#1e293b';
      finalCtx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      finalCtx.textAlign = 'center';
      finalCtx.textBaseline = 'middle';

      const userName = this.medicalForm.get('full_name')?.value || 'User';
      const bloodType = this.medicalForm.get('blood_type')?.value || '';

      // Draw user name
      finalCtx.fillText(userName, qrSize / 2, qrSize + 20);

      // Draw blood type if available
      if (bloodType) {
        finalCtx.fillStyle = '#dc2626';
        finalCtx.font = '14px system-ui, -apple-system, sans-serif';
        finalCtx.fillText(`Blood Type: ${bloodType}`, qrSize / 2, qrSize + 40);
      }

      // Convert to data URL and download
      const dataUrl = finalCanvas.toDataURL('image/png', 1.0);
      const filename = `healthscanqr-${userName.toLowerCase().replace(/\s+/g, '-')}.png`;
      
      this.downloadImage(dataUrl, filename);
    } catch (error) {
      console.error('Error saving QR code as image:', error);
      alert('Error saving QR code as image. Please try again.');
    }
  }

  // Add this method for printing the medical ID without QR code
  printMedicalID(): void {
    // Create a print-friendly version of the medical ID
    const printContent = this.createPrintContent();
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Medical ID - ${this.medicalForm.get('full_name')?.value || 'User'}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: white;
              color: black;
            }
            .print-container { 
              max-width: 600px; 
              margin: 0 auto; 
              border: 2px solid #3b82f6;
              border-radius: 16px;
              padding: 30px;
              background: white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .print-header { 
              background: linear-gradient(135deg, #1e3a8a, #3b82f6);
              color: white;
              padding: 20px;
              border-radius: 12px 12px 0 0;
              margin: -30px -30px 20px -30px;
              text-align: center;
            }
            .print-title { 
              font-size: 24px; 
              font-weight: bold; 
              margin: 0;
            }
            .print-subtitle { 
              font-size: 14px; 
              margin: 5px 0 0 0;
              opacity: 0.9;
            }
            .print-section { 
              margin: 20px 0; 
            }
            .print-row { 
              display: flex; 
              justify-content: space-between; 
              padding: 10px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .print-label { 
              font-weight: bold; 
              color: #374151;
              flex: 1;
            }
            .print-value { 
              flex: 2;
              color: #1f2937;
            }
            .emergency-note {
              background: #fef2f2;
              border: 1px solid #fecaca;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
              text-align: center;
              font-weight: bold;
              color: #dc2626;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #e5e7eb;
              color: #6b7280;
              font-size: 12px;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .print-container { border: none; box-shadow: none; margin: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Wait for content to load then print
      setTimeout(() => {
        printWindow.print();
        // printWindow.close(); // Optional: close after printing
      }, 500);
    }
  }

  // Helper method to create print content
  private createPrintContent(): string {
    const fullName = this.medicalForm.get('full_name')?.value || 'NOT PROVIDED';
    const dob = this.formattedDob || 'NOT PROVIDED';
    const bloodType = this.medicalForm.get('blood_type')?.value || 'NOT PROVIDED';
    const address = this.medicalForm.get('address')?.value || 'NOT PROVIDED';
    const allergies = this.medicalForm.get('allergies')?.value || 'None';
    const medications = this.medicalForm.get('medications')?.value || 'None';
    const conditions = this.medicalForm.get('conditions')?.value || 'None';
    const emergencyContact = this.medicalForm.get('emergency_contact')?.value || 'NOT PROVIDED';
    const lastUpdated = this.formatLastUpdated(this.lastUpdated);

    return `
      <div class="print-container">
        <div class="print-header">
          <h1 class="print-title">HEALTHSCANQR MEDICAL INFO</h1>
          <div class="print-subtitle">Emergency Medical Information</div>
        </div>
        
        <div class="print-section">
          <div class="print-row">
            <div class="print-label">Full Name:</div>
            <div class="print-value">${fullName}</div>
          </div>
          <div class="print-row">
            <div class="print-label">Date of Birth:</div>
            <div class="print-value">${dob}</div>
          </div>
          <div class="print-row">
            <div class="print-label">Blood Type:</div>
            <div class="print-value" style="color: #dc2626; font-weight: bold;">${bloodType}</div>
          </div>
          <div class="print-row">
            <div class="print-label">Address:</div>
            <div class="print-value">${address}</div>
          </div>
        </div>

        <div class="print-section">
          <h3 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 5px;">Medical Information</h3>
          <div class="print-row">
            <div class="print-label">Allergies:</div>
            <div class="print-value">${allergies}</div>
          </div>
          <div class="print-row">
            <div class="print-label">Medications:</div>
            <div class="print-value">${medications}</div>
          </div>
          <div class="print-row">
            <div class="print-label">Medical Conditions:</div>
            <div class="print-value">${conditions}</div>
          </div>
        </div>

        <div class="print-section">
          <h3 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 5px;">Emergency Contact</h3>
          <div class="print-row">
            <div class="print-label">Contact Person:</div>
            <div class="print-value">${emergencyContact}</div>
          </div>
        </div>

        <div class="emergency-note">
          ⚠️ FOR EMERGENCY PURPOSES ONLY ⚠️
        </div>

        <div class="footer">
          <p>Last Updated: ${lastUpdated}</p>
          <p>HealthScanQR Medical ID • Generated on ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
    `;
  }

  // Helper method to download image
  private downloadImage(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Format last updated timestamp for display
  formatLastUpdated(timestamp: string): string {
    if (!timestamp || timestamp === 'Never' || timestamp === 'never') {
      return 'Never';
    }
    
    try {
      // Handle both ISO string and other formats
      const date = new Date(timestamp);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return 'Never';
      }
      
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      console.error('Error formatting timestamp:', e);
      return 'Never';
    }
  }

  // Logout function
  logout(): void {
    localStorage.removeItem('user_id');
    localStorage.removeItem('medicalInfoLastUpdated');
    localStorage.removeItem('hasUpdated'); // ✅ Clear the update flag on logout
    this.router.navigate(['/login']);
  }
}
