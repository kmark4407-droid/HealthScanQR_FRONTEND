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

  // Logo for ID card
  private logoImage: HTMLImageElement | null = null;
  private logoLoaded: boolean = false;

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

    // Preload logo
    this.preloadLogo();
  }

  private preloadLogo(): void {
    this.logoImage = new Image();
    this.logoImage.crossOrigin = 'anonymous';
    this.logoImage.onload = () => {
      this.logoLoaded = true;
      console.log('Logo loaded successfully');
    };
    this.logoImage.onerror = () => {
      console.warn('Logo failed to load, using fallback');
      this.logoLoaded = false;
    };
    this.logoImage.src = './healthscanqr1.png';
  }

  ngOnInit(): void {
    this.loadMedicalData();
    
    // Auto-refresh data every 30 seconds to catch admin updates
    this.autoRefreshInterval = setInterval(() => {
      this.refreshMedicalData();
    }, 30000);
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
      this.http.get(`${environment.apiUrl}/medical/${userId}?t=${new Date().getTime()}`).subscribe({
        next: (res: any) => {
          // ✅ REVISED: Handle both cases: data exists or doesn't exist
          if (res && res.exists) {
            console.log('Medical data found:', res);
            
            // Handle date properly to prevent timezone shifting
            if (res.dob) {
              const normalized = this.normalizeDateString(res.dob);
              this.medicalForm.patchValue({...res, dob: normalized});
              this.formattedDob = this.formatDateForDisplay(normalized);
            } else {
              this.medicalForm.patchValue(res);
              if (this.medicalForm.get('dob')?.value) {
                this.formattedDob = this.formatDateForDisplay(this.medicalForm.get('dob')?.value);
              }
            }

            // Update user name for welcome message
            if (res.full_name) {
              this.userName = res.full_name;
            }

            // If backend returns photo_url, update profile images
            if (res.photo_url) {
              this.profilePhotoUrl = `${environment.apiUrl}${res.photo_url}`;
              setTimeout(() => {
                if (this.profilePreview) {
                  this.profilePreview.nativeElement.src = this.profilePhotoUrl;
                }
              }, 0);
            }

            // Handle lastUpdated timestamp
            this.handleLastUpdatedTimestamp(res);
            
            this.generateQRCode();
          } else {
            // ✅ REVISED: No medical data exists yet
            console.log('No medical data found for user');
            this.userName = 'User';
            this.lastUpdated = 'Never';
            this.generateQRCode();
          }
        },
        error: (err) => {
          console.error('❌ Error fetching medical info:', err);
          // On error, try to use stored timestamp
          const storedTimestamp = localStorage.getItem('medicalInfoLastUpdated');
          this.lastUpdated = storedTimestamp || 'Never';
          this.generateQRCode();
        }
      });
    } else {
      // For demo user, use stored timestamp or set to 'Never'
      const storedTimestamp = localStorage.getItem('medicalInfoLastUpdated');
      this.lastUpdated = storedTimestamp || 'Never';
      
      // Set default formatted date
      this.formattedDob = this.formatDateForDisplay('1990-01-15');
      
      setTimeout(() => {
        this.generateQRCode();
      }, 500);
    }
  }

  // Handle lastUpdated timestamp from various possible fields
  handleLastUpdatedTimestamp(data: any): void {
    const possibleTimestampFields = [
      'lastUpdated',
      'last_updated', 
      'updated_at',
      'updatedAt',
      'timestamp',
      'lastModified'
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
        console.log('Found valid timestamp:', this.lastUpdated);
      } else {
        console.warn('Invalid timestamp found:', foundTimestamp);
        this.lastUpdated = 'Never';
      }
    } else {
      console.log('No timestamp found in response, checking localStorage...');
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
          // ✅ REVISED: Handle the new response format
          if (res && res.exists) {
            if (res.dob) {
              const normalized = this.normalizeDateString(res.dob);
              this.medicalForm.patchValue({...res, dob: normalized});
              this.formattedDob = this.formatDateForDisplay(normalized);
            } else {
              this.medicalForm.patchValue(res);
            }

            // Update user name for welcome message
            if (res.full_name) {
              this.userName = res.full_name;
            }

            // Update timestamp when server provides data
            this.handleLastUpdatedTimestamp(res);

            if (res.photo_url) {
              this.profilePhotoUrl = `${environment.apiUrl}${res.photo_url}`;
              if (this.profilePreview) {
                this.profilePreview.nativeElement.src = this.profilePhotoUrl;
              }
            }

            this.generateQRCode();
          }
        },
        error: (err) => {
          console.error('Error refreshing medical data:', err);
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
    this.router.navigate(['/login']);
  }
}
