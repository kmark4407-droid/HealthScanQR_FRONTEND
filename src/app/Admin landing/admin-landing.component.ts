import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../Environments/environment';

declare var jsQR: any;

@Component({
  selector: 'app-admin-landing',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule
  ],
  templateUrl: './admin-landing.html',
  styleUrls: ['./admin-landing.css']
})
export class AdminLandingComponent implements OnInit, AfterViewInit {
  @ViewChild('videoElement') videoElement!: ElementRef;
  @ViewChild('canvasElement') canvasElement!: ElementRef;
  @ViewChild('uploadPreview') uploadPreview!: ElementRef;

  // Add Math reference for template use
  Math = Math;

  activeTab: string = 'scanner';
  editForm: FormGroup;
  scannedData: any = null;
  isEditing: boolean = false;
  originalData: any = null;

  // Scanner variables
  isScanning: boolean = false;
  scanStatus: string = '';
  scanStatusClass: string = '';
  scanResultVisible: boolean = false;
  videoStream: MediaStream | null = null;
  scanningInterval: any;

  // Logs variables
  activityLogs: any[] = [];
  filteredLogs: any[] = [];
  searchTerm: string = '';
  logsLoading: boolean = false;
  logsError: string = '';

  // User Management variables
  users: any[] = [];
  filteredUsers: any[] = [];
  approvedUsers: any[] = [];
  pendingUsers: any[] = [];
  userSearchTerm: string = '';
  selectedUser: any = null;
  isUserActionLoading: boolean = false;
  showUserDetails: boolean = false;
  userManagementTab: string = 'pending';

  // Analytics variables
  analyticsData: any = null;
  analyticsLoading: boolean = false;

  // Admin info
  adminName: string = 'Administrator';
  adminId: string = '';
  currentAdmin: any = null;
  jsQRLoaded: boolean = false;

  // Search debounce
  private searchTimeout: any;
  private lastLogTime: number = 0;
  private logDebounceTime: number = 1000;
  private lastScanLog: { user: string, timestamp: number } = { user: '', timestamp: 0 };

  // Date variables for analytics
  private todayDate: string = '';
  private weekStartDate: string = '';
  private monthStartDate: string = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.editForm = this.fb.group({
      full_name: ['', Validators.required],
      dob: ['', Validators.required],
      blood_type: ['', Validators.required],
      address: ['', Validators.required],
      allergies: [''],
      medications: [''],
      conditions: [''],
      emergency_contact: ['', Validators.required],
      user_id: ['']
    });
  }

  ngOnInit(): void {
    // Get admin info from localStorage
    const adminData = localStorage.getItem('admin_data');
    if (adminData) {
      this.currentAdmin = JSON.parse(adminData);
      this.adminName = this.currentAdmin.full_name || this.currentAdmin.email || 'Administrator';
      this.adminId = this.currentAdmin.id || '';
    }
    
    // Set admin_id in localStorage for backend
    if (this.adminId) {
      localStorage.setItem('admin_id', this.adminId);
    }
    
    console.log('🔄 Admin initialized:', { 
      name: this.adminName, 
      id: this.adminId,
      adminData: this.currentAdmin 
    });

    // Initialize dates
    this.initializeDates();

    this.loadActivityLogs();
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    this.loadScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js')
      .then(() => {
        console.log('jsQR library loaded');
        this.jsQRLoaded = true;
      })
      .catch(error => {
        console.error('Error loading jsQR library:', error);
      });
  }

  // ==================== DATE HELPER METHODS ====================

  initializeDates(): void {
    const today = new Date();
    
    // Today's date
    this.todayDate = this.formatDateForDisplay(today.toISOString());
    
    // Week start date (Monday)
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    this.weekStartDate = this.formatDateForDisplay(monday.toISOString());
    
    // Month start date
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.monthStartDate = this.formatDateForDisplay(firstDay.toISOString());
  }

  getTodayDate(): string {
    return this.todayDate;
  }

  getWeekStartDate(): string {
    return this.weekStartDate;
  }

  getMonthStartDate(): string {
    return this.monthStartDate;
  }

  // Helper to format date as MM/DD
  formatDateForDisplay(dateString: string): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }).replace(',', '');
    } catch (e) {
      console.error('Error formatting date for display:', e);
      return dateString.split('T')[0];
    }
  }

  // For print/export formatting (full date)
  formatDateForExport(dateString: string): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric',
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      console.error('Error formatting date for export:', e);
      return dateString;
    }
  }

  // ==================== TAB NAVIGATION ====================

  loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = (error) => reject(error);
      document.head.appendChild(script);
    });
  }

  closeHamburgerMenu(): void {
    if (window.innerWidth <= 768) {
      const adminTabs = document.getElementById('adminTabs');
      const hamburgerMenu = document.getElementById('hamburgerMenu');
      
      if (adminTabs && hamburgerMenu) {
        adminTabs.classList.remove('hamburger-active');
        hamburgerMenu.classList.remove('active');
      }
    }
  }

  toggleHamburgerMenu(): void {
    if (window.innerWidth <= 768) {
      const adminTabs = document.getElementById('adminTabs');
      const hamburgerMenu = document.getElementById('hamburgerMenu');
      
      if (adminTabs && hamburgerMenu) {
        const isActive = adminTabs.classList.contains('hamburger-active');
        
        if (isActive) {
          this.closeHamburgerMenu();
        } else {
          adminTabs.classList.add('hamburger-active');
          hamburgerMenu.classList.add('active');
        }
      }
    }
  }

  switchTab(tabName: string): void {
    this.activeTab = tabName;
    
    if (window.innerWidth <= 768) {
      this.closeHamburgerMenu();
    }
    
    if (tabName !== 'scanner' && this.isScanning) {
      this.stopCamera();
    }
    if (tabName === 'logs') {
      this.loadActivityLogs();
    }
    if (tabName === 'users') {
      this.loadUsers();
      this.showUserDetails = false;
      this.userManagementTab = 'pending';
    }
    if (tabName === 'analytics') {
      this.loadAnalytics();
    }
  }

  // ==================== ANALYTICS METHODS ====================

  loadAnalytics(): void {
    this.analyticsLoading = true;
    console.log('📊 Loading analytics data...');
    
    const url = `${environment.apiUrl}/admin/analytics?dateRange=30days`;
    
    this.http.get(url).subscribe({
      next: (res: any) => {
        console.log('✅ Analytics API response:', res);
        
        if (res && res.success && res.analytics) {
          this.analyticsData = res.analytics;
          this.processAnalyticsData();
        } else {
          this.generateAnalyticsData();
        }
        
        this.analyticsLoading = false;
      },
      error: (err) => {
        console.error('❌ Error loading analytics from API:', err);
        this.generateAnalyticsData();
        this.analyticsLoading = false;
      }
    });
  }

  processAnalyticsData(): void {
    if (!this.analyticsData) return;
    
    // Process demographics data
    if (this.analyticsData.demographics && this.analyticsData.demographics.length > 0) {
      this.analyticsData.demographics = this.analyticsData.demographics.map((demo: any) => ({
        blood_type: demo.blood_type || 'Unknown',
        count: parseInt(demo.count) || 0,
        average_age: demo.average_age || demo.avg_age || 'N/A',
        trend: this.getRandomTrend()
      }));
    }
    
    // Process top conditions data
    if (this.analyticsData.topConditions && this.analyticsData.topConditions.length > 0) {
      this.analyticsData.topConditions = this.analyticsData.topConditions.map((condition: any) => ({
        condition: condition.condition || 'Unknown',
        patient_count: parseInt(condition.patient_count) || parseInt(condition.patients) || 0
      }));
    }
    
    // Calculate daily activity
    this.calculateDailyActivity();
  }

  calculateDailyActivity(): void {
    // Track today's scans in real-time
    const todayScans = parseInt(localStorage.getItem('today_scans') || '0');
    if (todayScans > 0) {
      this.analyticsData.dailyScans = todayScans;
    }
    
    // Update weekly scans based on daily
    if (this.analyticsData.dailyScans) {
      this.analyticsData.weeklyScans = this.analyticsData.dailyScans * 5; // Estimate
    }
  }

  getRandomTrend(): string {
    const trends = ['up', 'down', 'stable'];
    return trends[Math.floor(Math.random() * trends.length)];
  }

  refreshAnalytics(): void {
    console.log('🔄 Refreshing analytics...');
    this.loadAnalytics();
  }

  generateAnalyticsData(): void {
    console.log('📊 Generating analytics data with actual dates');
    
    // Get actual dates
    const today = new Date();
    const todayScans = parseInt(localStorage.getItem('today_scans') || '15');
    
    // Calculate week start date (Monday)
    const weekStart = new Date(today);
    const dayOfWeek = weekStart.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday
    weekStart.setDate(weekStart.getDate() + diffToMonday);
    
    // Calculate month start date
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.analyticsData = {
      totalUsers: 156,
      userGrowthRate: 12.5,
      totalScans: 423,
      scanGrowthRate: 8.3,
      approvedUsers: 134,
      approvalRate: 85.9,
      
      // Activity data - updated with actual dates
      dailyScans: todayScans,
      weeklyScans: 87,
      monthlyScans: 423,
      
      dailyRegistrations: 3,
      weeklyRegistrations: 18,
      monthlyRegistrations: 56,
      
      dailyUpdates: 8,
      weeklyUpdates: 45,
      monthlyUpdates: 192,
      
      scanGrowth: 8.3,
      registrationGrowth: 12.5,
      updateGrowth: 15.7,
      
      // Demographics
      demographics: [
        { blood_type: 'O+', count: 56, average_age: '42', trend: 'up' },
        { blood_type: 'A+', count: 34, average_age: '38', trend: 'stable' },
        { blood_type: 'B+', count: 28, average_age: '45', trend: 'down' },
        { blood_type: 'AB+', count: 12, average_age: '50', trend: 'stable' },
        { blood_type: 'O-', count: 18, average_age: '35', trend: 'up' },
        { blood_type: 'A-', count: 8, average_age: '40', trend: 'stable' }
      ],
      
      // Top conditions
      topConditions: [
        { condition: 'Hypertension', patient_count: 45 },
        { condition: 'Diabetes', patient_count: 32 },
        { condition: 'Asthma', patient_count: 28 },
        { condition: 'Arthritis', patient_count: 22 },
        { condition: 'Allergies', patient_count: 56 },
        { condition: 'Migraine', patient_count: 18 }
      ],
      
      // Date references (for tracking)
      dateReferences: {
        today: today.toISOString().split('T')[0],
        weekStart: weekStart.toISOString().split('T')[0],
        monthStart: monthStart.toISOString().split('T')[0]
      }
    };
  }

  // ==================== ANALYTICS EXPORT METHODS ====================

  exportAnalyticsToPDF(): void {
    this.analyticsLoading = true;
    
    try {
      const analyticsContent = this.generateAnalyticsHTML();
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>HealthScanQR Analytics Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #4b6cb7; text-align: center; }
              h2 { color: #333; border-bottom: 2px solid #4b6cb7; padding-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th { background-color: #4b6cb7; color: white; padding: 12px; text-align: left; }
              td { padding: 10px; border-bottom: 1px solid #ddd; }
              tr:nth-child(even) { background-color: #f8f9fa; }
              .metric-card { 
                background: #f8fafc; 
                border: 1px solid #e2e8f0; 
                border-radius: 8px; 
                padding: 15px; 
                margin: 10px 0;
              }
              .metric-value { font-size: 24px; font-weight: bold; color: #4b6cb7; }
              .metric-label { color: #64748b; font-size: 14px; }
              @media print {
                body { margin: 0; padding: 20px; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            <h1>HealthScanQR Analytics Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
            <p>Generated by: ${this.adminName}</p>
            <p>Report Period: ${this.monthStartDate} to ${this.todayDate}</p>
            
            ${analyticsContent}
            
            <br><br>
            <div style="text-align: center; color: #666; font-size: 12px;">
              <hr>
              <p>Confidential - For internal use only</p>
              <p>© ${new Date().getFullYear()} HealthScanQR. All rights reserved.</p>
            </div>
            
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              };
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
        
        this.logActivity('EXPORT', 'Exported analytics report to PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating report. Please try the print option instead.');
    } finally {
      this.analyticsLoading = false;
    }
  }

  generateAnalyticsHTML(): string {
    if (!this.analyticsData) return '<p>No analytics data available.</p>';
    
    let html = `
      <h2>System Overview</h2>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0;">
        <div class="metric-card">
          <div class="metric-value">${this.analyticsData.totalUsers}</div>
          <div class="metric-label">Total Users</div>
          <div>${this.analyticsData.approvedUsers} approved</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">${this.analyticsData.totalScans}</div>
          <div class="metric-label">QR Scans</div>
          <div>${this.analyticsData.dailyScans} today</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">${this.analyticsData.approvalRate}%</div>
          <div class="metric-label">Approval Rate</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">${this.analyticsData.scanGrowthRate}%</div>
          <div class="metric-label">Scan Growth</div>
        </div>
      </div>
      
      <h2>Activity Summary (${this.monthStartDate} - ${this.todayDate})</h2>
      <table>
        <thead>
          <tr>
            <th>Activity Type</th>
            <th>Today (${this.todayDate})</th>
            <th>This Week (${this.weekStartDate} - ${this.todayDate})</th>
            <th>This Month (${this.monthStartDate} - ${this.todayDate})</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>QR Scans</td>
            <td>${this.analyticsData.dailyScans}</td>
            <td>${this.analyticsData.weeklyScans}</td>
            <td>${this.analyticsData.monthlyScans}</td>
          </tr>
          <tr>
            <td>User Registrations</td>
            <td>${this.analyticsData.dailyRegistrations}</td>
            <td>${this.analyticsData.weeklyRegistrations}</td>
            <td>${this.analyticsData.monthlyRegistrations}</td>
          </tr>
          <tr>
            <td>Profile Updates</td>
            <td>${this.analyticsData.dailyUpdates}</td>
            <td>${this.analyticsData.weeklyUpdates}</td>
            <td>${this.analyticsData.monthlyUpdates}</td>
          </tr>
        </tbody>
      </table>
      
      <h2>Blood Type Distribution</h2>
      <table>
        <thead>
          <tr>
            <th>Blood Type</th>
            <th>Users</th>
            <th>Avg Age</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    if (this.analyticsData.demographics && this.analyticsData.demographics.length > 0) {
      this.analyticsData.demographics.forEach((demo: any) => {
        html += `
          <tr>
            <td>${demo.blood_type || 'Unknown'}</td>
            <td>${demo.count || 0}</td>
            <td>${demo.average_age || 'N/A'}</td>
          </tr>
        `;
      });
    } else {
      html += `<tr><td colspan="3" style="text-align: center;">No demographic data available</td></tr>`;
    }
    
    html += `
        </tbody>
      </table>
      
      <h2>Common Medical Conditions</h2>
      <table>
        <thead>
          <tr>
            <th>Condition</th>
            <th>Patients</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    if (this.analyticsData.topConditions && this.analyticsData.topConditions.length > 0) {
      this.analyticsData.topConditions.forEach((condition: any) => {
        html += `
          <tr>
            <td>${condition.condition || 'Unknown'}</td>
            <td>${condition.patient_count || 0}</td>
          </tr>
        `;
      });
    } else {
      html += `<tr><td colspan="2" style="text-align: center;">No medical conditions data available</td></tr>`;
    }
    
    html += `
        </tbody>
      </table>
    `;
    
    return html;
  }

  exportAnalyticsToCSV(): void {
    if (!this.analyticsData) {
      alert('No analytics data to export.');
      return;
    }
    
    const csvContent = this.convertAnalyticsToCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `healthscanqr-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    this.logActivity('EXPORT', 'Exported analytics data to CSV');
  }

  convertAnalyticsToCSV(): string {
    if (!this.analyticsData) return '';
    
    const headers = ['Metric', 'Value', 'Date Range'];
    const rows = [];
    const today = new Date().toLocaleDateString();
    
    // Key metrics
    rows.push(['Total Users', this.analyticsData.totalUsers, today]);
    rows.push(['Total Scans', this.analyticsData.totalScans, today]);
    rows.push(['Approved Users', this.analyticsData.approvedUsers, today]);
    rows.push(['Approval Rate', `${this.analyticsData.approvalRate}%`, today]);
    rows.push(['Scan Growth', `${this.analyticsData.scanGrowthRate}%`, today]);
    
    // Add empty row
    rows.push(['', '', '']);
    rows.push(['Activity Summary', '', '']);
    rows.push(['Activity Type', `Today (${this.todayDate})`, `This Week (${this.weekStartDate} - ${this.todayDate})`, `This Month (${this.monthStartDate} - ${this.todayDate})`]);
    rows.push(['QR Scans', this.analyticsData.dailyScans, this.analyticsData.weeklyScans, this.analyticsData.monthlyScans]);
    rows.push(['User Registrations', this.analyticsData.dailyRegistrations, this.analyticsData.weeklyRegistrations, this.analyticsData.monthlyRegistrations]);
    rows.push(['Profile Updates', this.analyticsData.dailyUpdates, this.analyticsData.weeklyUpdates, this.analyticsData.monthlyUpdates]);
    
    // Add empty row
    rows.push(['', '', '']);
    rows.push(['Blood Type Distribution', '', '']);
    rows.push(['Blood Type', 'Users', 'Avg Age']);
    
    // Demographics
    if (this.analyticsData.demographics && this.analyticsData.demographics.length > 0) {
      this.analyticsData.demographics.forEach((demo: any) => {
        rows.push([demo.blood_type, demo.count, demo.average_age || 'N/A']);
      });
    } else {
      rows.push(['No demographic data available', '', '']);
    }
    
    // Add empty row
    rows.push(['', '', '']);
    rows.push(['Common Medical Conditions', '', '']);
    rows.push(['Condition', 'Patients']);
    
    // Top conditions
    if (this.analyticsData.topConditions && this.analyticsData.topConditions.length > 0) {
      this.analyticsData.topConditions.forEach((condition: any) => {
        rows.push([condition.condition, condition.patient_count]);
      });
    } else {
      rows.push(['No medical conditions data available', '']);
    }
    
    return [headers, ...rows].map(row => row.map(field => `"${field || ''}"`).join(',')).join('\n');
  }

  exportAnalyticsToExcel(): void {
    // For simplicity, we'll just export as CSV since Excel can open CSV files
    this.exportAnalyticsToCSV();
    this.logActivity('EXPORT', 'Exported analytics data to Excel');
  }

  printAnalytics(): void {
    const analyticsContent = this.generateAnalyticsHTML();
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HealthScanQR Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #4b6cb7; text-align: center; }
          h2 { color: #333; border-bottom: 2px solid #4b6cb7; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #4b6cb7; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f8f9fa; }
          @media print {
            body { margin: 0; padding: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>HealthScanQR Analytics Report</h1>
        <p>Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        <p>Generated by: ${this.adminName}</p>
        <p>Report Period: ${this.monthStartDate} to ${this.todayDate}</p>
        ${analyticsContent}
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
    
    this.logActivity('PRINT', 'Printed analytics report');
  }

  // ==================== ACTIVITY LOGS METHODS ====================

  loadActivityLogs(): void {
    this.logsLoading = true;
    this.logsError = '';
    
    console.log('🔄 Loading activity logs...');

    const url = `${environment.apiUrl}/admin/activity-logs`;

    this.http.get(url).subscribe({
      next: (res: any) => {
        console.log('✅ Activity logs response:', res);
        
        if (res && res.success && res.logs) {
          this.activityLogs = res.logs.map((log: any) => ({
            ...log,
            description: this.cleanLogDescription(log.description || '')
          }));
          this.filteredLogs = [...this.activityLogs];
          console.log(`📊 Loaded ${this.activityLogs.length} activity logs`);
        } else if (res && Array.isArray(res)) {
          this.activityLogs = res.map((log: any) => ({
            ...log,
            description: this.cleanLogDescription(log.description || '')
          }));
          this.filteredLogs = [...this.activityLogs];
          console.log(`📊 Loaded ${this.activityLogs.length} activity logs (direct array)`);
        } else {
          console.warn('⚠️ No logs found in response:', res);
          this.activityLogs = [];
          this.filteredLogs = [];
        }
        
        this.logsLoading = false;
      },
      error: (err) => {
        console.error('❌ Error loading activity logs:', err);
        this.logsError = this.getLogsErrorMessage(err);
        this.activityLogs = [];
        this.filteredLogs = [];
        this.logsLoading = false;
        
        this.tryAlternativeLogsEndpoint();
      }
    });
  }

  private tryAlternativeLogsEndpoint(): void {
    console.log('🔄 Trying alternative logs endpoint...');
    
    this.http.get(`${environment.apiUrl}/admin/logs`).subscribe({
      next: (res: any) => {
        console.log('✅ Alternative logs response:', res);
        
        if (res && res.success && res.logs) {
          this.activityLogs = res.logs.map((log: any) => ({
            ...log,
            description: this.cleanLogDescription(log.description || '')
          }));
          this.filteredLogs = [...this.activityLogs];
          console.log(`📊 Loaded ${this.activityLogs.length} logs from alternative endpoint`);
          this.logsError = '';
        }
      },
      error: (err) => {
        console.error('❌ Alternative endpoint also failed:', err);
        this.createSampleLogs();
      }
    });
  }

  private createSampleLogs(): void {
    console.log('📝 Creating sample logs for demo...');
    
    this.activityLogs = [
      {
        id: 1,
        action: 'SYSTEM',
        description: 'Activity logs system initialized',
        admin_id: this.adminId || 1,
        admin_name: 'System',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        action: 'LOGIN',
        description: `Admin ${this.adminName} logged in`,
        admin_id: this.adminId || 1,
        admin_name: this.adminName,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
    ];
    this.filteredLogs = [...this.activityLogs];
    this.logsError = 'Using demo logs - backend connection issue';
    console.log(`📊 Created ${this.activityLogs.length} sample logs`);
  }

  private getLogsErrorMessage(error: any): string {
    if (error.status === 0) {
      return 'Cannot connect to server. Please check if the server is running.';
    } else if (error.status === 404) {
      return 'Logs endpoint not found. The activity logs table might not be created yet.';
    } else if (error.status === 401) {
      return 'Authentication required. Please log in again.';
    } else if (error.error?.message) {
      return error.error.message;
    } else {
      return 'Failed to load activity logs. Please try again.';
    }
  }

  cleanLogDescription(description: string): string {
    if (!description) return '';
    
    return description
      .replace(/user_id:\s*[^,\s)]+/gi, '')
      .replace(/user_id\s*[^,\s)]+/gi, '')
      .replace(/\(ID:\s*[^)]+\)/gi, '')
      .replace(/ID:\s*[^,\s)]+/gi, '')
      .replace(/\s*,\s*,/g, ',')
      .replace(/,\s*$/, '')
      .replace(/\s+/g, ' ')
      .replace(/\s+\)/g, ')')
      .trim();
  }

  logActivity(action: string, description: string, changes: string = ''): void {
    const now = Date.now();
    
    if (action === 'SCAN') {
      const scanCooldown = 3000;
      
      const userMatch = description.match(/Scanned medical QR for: (.+)$/);
      const currentUser = userMatch ? userMatch[1].trim() : '';
      
      if (currentUser && 
          this.lastScanLog.user === currentUser && 
          now - this.lastScanLog.timestamp < scanCooldown) {
        console.log('🔄 Skipping duplicate scan log for same user:', currentUser);
        return;
      }
      
      this.lastScanLog = {
        user: currentUser,
        timestamp: now
      };
      
      // Track today's scans for analytics
      if (currentUser) {
        const todayScans = parseInt(localStorage.getItem('today_scans') || '0');
        localStorage.setItem('today_scans', (todayScans + 1).toString());
      }
    } else {
      if (now - this.lastLogTime < this.logDebounceTime) {
        console.log('🔄 Skipping duplicate log entry (debounce)');
        return;
      }
      this.lastLogTime = now;
    }
    
    let cleanChanges = changes;
    if (changes) {
      cleanChanges = this.cleanLogDescription(changes);
    }
    
    let cleanDescription = this.cleanLogDescription(description);
    
    const logData = {
      action,
      description: cleanChanges ? `${cleanDescription} - Changed: ${cleanChanges}` : cleanDescription,
      admin_id: this.adminId,
      admin_name: this.adminName,
      timestamp: new Date().toISOString()
    };

    console.log('📝 Logging activity:', logData);

    this.http.post(`${environment.apiUrl}/admin/log-activity`, logData).subscribe({
      next: (res: any) => {
        console.log('✅ Activity logged successfully:', res);
        if (action !== 'SYSTEM') {
          setTimeout(() => this.loadActivityLogs(), 500);
        }
      },
      error: (err) => {
        console.error('❌ Error logging activity:', err);
        console.log('📝 Activity recorded locally (log may not be saved)');
      }
    });
  }

  filterLogs(): void {
    if (!this.searchTerm) {
      this.filteredLogs = this.activityLogs;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredLogs = this.activityLogs.filter(log => 
      (log.description && log.description.toLowerCase().includes(term)) ||
      (log.action && log.action.toLowerCase().includes(term)) ||
      (log.admin_name && log.admin_name.toLowerCase().includes(term))
    );
  }

  clearLogs(): void {
    if (confirm('Are you sure you want to clear all activity logs? This action cannot be undone.')) {
      this.http.delete(`${environment.apiUrl}/admin/clear-logs`).subscribe({
        next: (res: any) => {
          console.log('✅ Logs cleared successfully:', res);
          this.activityLogs = [];
          this.filteredLogs = [];
          this.logActivity('SYSTEM', 'Cleared all activity logs');
          alert('Activity logs cleared successfully');
        },
        error: (err) => {
          console.error('❌ Error clearing logs:', err);
          alert('Failed to clear activity logs: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  exportLogs(): void {
    if (this.filteredLogs.length === 0) {
      alert('No logs to export.');
      return;
    }

    const csvContent = this.convertLogsToCSV(this.filteredLogs);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  convertLogsToCSV(logs: any[]): string {
    const headers = ['Timestamp', 'Action', 'Description', 'Admin'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.action,
      `"${(log.description || '').replace(/"/g, '""')}"`,
      log.admin_name
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  formatTimestamp(timestamp: string): string {
    if (!timestamp) return 'Unknown';
    
    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      console.error('Error formatting timestamp:', e);
      return timestamp;
    }
  }

  // ==================== USER MANAGEMENT METHODS ====================

  switchUserManagementTab(tabName: string): void {
    this.userManagementTab = tabName;
    this.selectedUser = null;
    this.showUserDetails = false;
    
    console.log(`🔄 Switched to ${tabName} tab`);
  }

  loadUsers(): void {
    this.http.get(`${environment.apiUrl}/admin/users`).subscribe({
      next: (res: any) => {
        this.users = res.users || [];
        console.log('📊 Loaded users:', this.users.length);
        
        // FILTER OUT USERS WHO HAVEN'T VALIDATED THEIR DATA
        this.filteredUsers = this.users.filter(user => 
          this.isUserDataValidated(user)
        );
        
        console.log('✅ Filtered validated users:', this.filteredUsers.length);
        this.separateUsersByApproval();
      },
      error: (err) => {
        console.error('Error loading users:', err);
        alert('Failed to load users. Please try again.');
      }
    });
  }

  // NEW METHOD: Check if user has validated their medical data
  private isUserDataValidated(user: any): boolean {
    if (!user) return false;
    
    // Check if user has completed basic medical information
    const hasBasicInfo = user.full_name && 
                        user.full_name !== 'Not provided' && 
                        user.full_name.trim() !== '' &&
                        user.dob &&
                        user.blood_type &&
                        user.address &&
                        user.emergency_contact;
    
    // Check if user has at least some medical information filled
    const hasMedicalInfo = user.allergies || user.medications || user.conditions;
    
    // User is considered validated if they have basic info AND at least some medical info
    const isValidated = hasBasicInfo && (hasMedicalInfo || user.approved);
    
    console.log(`🔍 User validation check: ${user.full_name}`, {
      hasBasicInfo,
      hasMedicalInfo,
      approved: user.approved,
      isValidated
    });
    
    return isValidated;
  }

  private separateUsersByApproval(): void {
    this.approvedUsers = [];
    this.pendingUsers = [];
    
    const usersToSeparate = this.filteredUsers.length > 0 ? this.filteredUsers : this.users;
    
    usersToSeparate.forEach(user => {
      if (user && this.isUserDataValidated(user)) {
        if (user.approved === true) {
          this.approvedUsers.push(user);
        } else {
          this.pendingUsers.push(user);
        }
      }
    });
    
    console.log('🔄 Separated validated users - Approved:', this.approvedUsers.length, 'Pending:', this.pendingUsers.length);
  }

  filterUsers(): void {
    const term = this.userSearchTerm ? this.userSearchTerm.toLowerCase().trim() : '';
    
    if (!term) {
      this.filteredUsers = this.users.filter(user => this.isUserDataValidated(user));
    } else {
      this.filteredUsers = this.users.filter(user => {
        if (!user || !this.isUserDataValidated(user)) return false;
        
        const nameMatch = user.full_name && user.full_name.toLowerCase().includes(term);
        const emailMatch = user.email && user.email.toLowerCase().includes(term);
        const bloodTypeMatch = user.blood_type && user.blood_type.toLowerCase().includes(term);
        const addressMatch = user.address && user.address.toLowerCase().includes(term);
        
        return nameMatch || emailMatch || bloodTypeMatch || addressMatch;
      });
    }
    
    this.separateUsersByApproval();
  }

  onSearchInput(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    this.searchTimeout = setTimeout(() => {
      this.filterUsers();
    }, 300);
  }

  selectUser(user: any): void {
    this.selectedUser = user;
  }

  approveUser(user: any): void {
    if (!confirm(`Approve medical information for ${user.full_name}?`)) {
      return;
    }

    this.isUserActionLoading = true;
    this.http.post(`${environment.apiUrl}/admin/approve-user`, {
      user_id: user.user_id,
      admin_id: this.adminId
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          user.approved = true;
          user.approved_at = new Date().toISOString();
          user.approved_by = this.adminName;
          this.separateUsersByApproval();
          this.logActivity('APPROVE', `Approved medical information for: ${user.full_name}`);
          alert('User medical information approved successfully!');
        } else {
          alert('Failed to approve user: ' + (res.message || 'Unknown error'));
        }
        this.isUserActionLoading = false;
      },
      error: (err) => {
        console.error('Error approving user:', err);
        alert('Failed to approve user. Please try again.');
        this.isUserActionLoading = false;
      }
    });
  }

  unapproveUser(user: any): void {
    if (!confirm(`Unapprove medical information for ${user.full_name}?`)) {
      return;
    }

    this.isUserActionLoading = true;
    this.http.post(`${environment.apiUrl}/admin/unapprove-user`, {
      user_id: user.user_id,
      admin_id: this.adminId
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          user.approved = false;
          user.approved_at = null;
          user.approved_by = null;
          this.separateUsersByApproval();
          this.logActivity('UNAPPROVE', `Unapproved medical information for: ${user.full_name}`);
          alert('User medical information unapproved successfully!');
        } else {
          alert('Failed to unapprove user: ' + (res.message || 'Unknown error'));
        }
        this.isUserActionLoading = false;
      },
      error: (err) => {
        console.error('Error unapproving user:', err);
        alert('Failed to unapprove user. Please try again.');
        this.isUserActionLoading = false;
      }
    });
  }

  deleteUser(user: any): void {
    if (!confirm(`DELETE user ${user.full_name}? This action cannot be undone and will permanently remove all their medical information.`)) {
      return;
    }

    this.isUserActionLoading = true;
    this.http.delete(`${environment.apiUrl}/admin/delete-user/${user.user_id}`, {
      body: { admin_id: this.adminId }
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.logActivity('DELETE', `Deleted user: ${user.full_name}`);
          alert('User deleted successfully!');
          this.users = this.users.filter(u => u.user_id !== user.user_id);
          this.filteredUsers = this.filteredUsers.filter(u => u.user_id !== user.user_id);
          this.separateUsersByApproval();
          this.selectedUser = null;
          this.showUserDetails = false;
        } else {
          alert('Failed to delete user: ' + (res.message || 'Unknown error'));
        }
        this.isUserActionLoading = false;
      },
      error: (err) => {
        console.error('Error deleting user:', err);
        let errorMessage = 'Failed to delete user. ';
        if (err.error?.message) {
          errorMessage += err.error.message;
        }
        alert(errorMessage);
        this.isUserActionLoading = false;
      }
    });
  }

  viewUserDetails(user: any): void {
    this.selectedUser = user;
    this.showUserDetails = true;
    setTimeout(() => {
      const detailsSection = document.getElementById('userDetailsSection');
      if (detailsSection) {
        detailsSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

  closeUserDetails(): void {
    this.showUserDetails = false;
    this.selectedUser = null;
  }

  exportUsers(): void {
    const usersToExport = this.filteredUsers.length > 0 ? this.filteredUsers : this.users.filter(user => this.isUserDataValidated(user));
    
    if (usersToExport.length === 0) {
      alert('No validated users to export.');
      return;
    }

    const csvContent = this.convertUsersToCSV(usersToExport);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  convertUsersToCSV(users: any[]): string {
    const headers = ['Full Name', 'Email', 'Approved', 'Approved At', 'Approved By', 'Created At', 'Last Updated'];
    const rows = users.map(user => [
      user.full_name || '',
      user.email || '',
      user.approved ? 'Yes' : 'No',
      user.approved_at ? new Date(user.approved_at).toLocaleString() : '',
      user.approved_by || '',
      user.created_at ? new Date(user.created_at).toLocaleString() : '',
      user.lastUpdated ? new Date(user.lastUpdated).toLocaleString() : ''
    ]);
    
    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
  }

  getStatusBadgeClass(user: any): string {
    if (user.approved === true) return 'status-approved';
    return 'status-pending';
  }

  getUserInitials(user: any): string {
    if (!user.full_name || user.full_name === 'Not provided') return 'U';
    return user.full_name
      .split(' ')
      .map((name: string) => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // ==================== PROFILE PHOTO METHODS ====================

  getProfilePhoto(user: any): string {
    if (!user) return this.getPlaceholderImage(user);
    
    let photoPath = user.profile_photo;
    
    if (photoPath && photoPath.startsWith('data:image/')) {
      return photoPath;
    }
    
    if (photoPath && photoPath.startsWith('http')) {
      return photoPath;
    }
    
    if (photoPath && !photoPath.startsWith('data:image/') && !photoPath.startsWith('http')) {
      if (photoPath.startsWith('/uploads/')) {
        return `${environment.apiUrl}${photoPath}`;
      } else if (photoPath.startsWith('uploads/')) {
        return `${environment.apiUrl}/${photoPath}`;
      } else if (photoPath.startsWith('/')) {
        return `${environment.apiUrl}${photoPath}`;
      } else {
        return `${environment.apiUrl}/uploads/${photoPath}`;
      }
    }
    
    return this.getPlaceholderImage(user);
  }

  getPlaceholderImage(user: any): string {
    const initials = this.getUserInitials(user);
    const backgroundColor = this.stringToColor(user?.email || user?.full_name || 'User');
    const textColor = this.getContrastColor(backgroundColor);
    
    const svg = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${backgroundColor}"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
              font-family="Arial, sans-serif" font-size="80" fill="${textColor}">
          ${initials}
        </text>
      </svg>
    `;
    
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

  stringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ];
    
    return colors[Math.abs(hash) % colors.length];
  }

  getContrastColor(hexcolor: string): string {
    const r = parseInt(hexcolor.substr(1, 2), 16);
    const g = parseInt(hexcolor.substr(3, 2), 16);
    const b = parseInt(hexcolor.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#FFFFFF';
  }

  handleImageError(event: any, user: any): void {
    console.warn('Failed to load profile photo for user:', user?.full_name);
    
    const imgElement = event.target;
    imgElement.src = this.getPlaceholderImage(user);
    imgElement.onerror = null;
    
    const avatarContainer = imgElement.closest('.user-avatar') || imgElement.closest('.user-profile-avatar');
    if (avatarContainer) {
      const initialsElement = avatarContainer.querySelector('.initials');
      if (initialsElement) {
        initialsElement.style.display = 'flex';
      }
    }
  }

  changeUserProfile(userId: string, photoFile: File): void {
    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      const base64Image = e.target.result;
      
      console.log('📸 Changing profile photo for user:', userId);
      console.log('📁 Base64 image size:', base64Image.length);

      this.http.post(`${environment.apiUrl}/admin/change-user-profile-base64`, {
        user_id: userId,
        profile_photo: base64Image,
        filename: photoFile.name
      }).subscribe({
        next: (res: any) => {
          console.log('✅ Profile photo update response:', res);
          if (res.success) {
            console.log('✅ Profile photo updated successfully');
            this.logActivity('PROFILE_UPDATE', `Changed profile photo for user ID: ${userId}`);
            alert('Profile photo updated successfully!');
            
            this.updateUserPhotoInMemory(userId, base64Image);
            
          } else {
            alert('Failed to update profile photo: ' + (res.message || 'Unknown error'));
          }
        },
        error: (err) => {
          console.error('❌ Error updating profile photo:', err);
          let errorMessage = 'Failed to update profile photo. ';
          
          if (err.status === 0) {
            errorMessage += 'Cannot connect to server. Please check if the server is running.';
          } else if (err.status === 400) {
            errorMessage += err.error?.message || 'Invalid request. Please check the file format.';
          } else if (err.status === 413) {
            errorMessage += 'File too large. Please choose a smaller image.';
          } else if (err.error?.message) {
            errorMessage += err.error.message;
          } else {
            errorMessage += 'Please try again.';
          }
          
          alert(errorMessage);
        }
      });
    };
    
    reader.onerror = (error) => {
      console.error('❌ Error reading file:', error);
      alert('Error reading the selected file. Please try another image.');
    };
    
    reader.readAsDataURL(photoFile);
  }

  private updateUserPhotoInMemory(userId: string, base64Image: string): void {
    this.users = this.users.map(user => 
      user.user_id === userId ? { ...user, profile_photo: base64Image } : user
    );
    
    this.filteredUsers = this.filteredUsers.map(user => 
      user.user_id === userId ? { ...user, profile_photo: base64Image } : user
    );
    
    this.approvedUsers = this.approvedUsers.map(user => 
      user.user_id === userId ? { ...user, profile_photo: base64Image } : user
    );
    
    this.pendingUsers = this.pendingUsers.map(user => 
      user.user_id === userId ? { ...user, profile_photo: base64Image } : user
    );
    
    if (this.selectedUser && this.selectedUser.user_id === userId) {
      this.selectedUser.profile_photo = base64Image;
    }
    
    if (this.scannedData && this.scannedData.user_id === userId) {
      this.scannedData.profile_photo = base64Image;
      console.log('✅ Updated scanned data profile photo for edit tab');
    }
    
    console.log('✅ Updated profile photo in memory for user:', userId);
  }

  changeScannedUserProfile(): void {
    if (!this.scannedData || !this.scannedData.user_id) {
      alert('No user selected. Please scan a QR code first.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          alert('Please select a valid image file (JPEG, PNG, etc.)');
          return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
          alert('Image file size must be less than 5MB');
          return;
        }
        
        this.changeUserProfile(this.scannedData.user_id, file);
      }
    };
    input.click();
  }

  changeEditTabProfile(): void {
    if (!this.scannedData || !this.scannedData.user_id) {
      alert('No user selected for editing. Please scan a QR code first.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          alert('Please select a valid image file (JPEG, PNG, etc.)');
          return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
          alert('Image file size must be less than 5MB');
          return;
        }
        
        this.changeUserProfile(this.scannedData.user_id, file);
      }
    };
    input.click();
  }

  // ==================== SCANNER METHODS ====================

  async startCamera(): Promise<void> {
    try {
      this.isScanning = true;
      this.scanStatus = 'Scanning...';
      this.scanStatusClass = 'status-scanning';
      this.scanResultVisible = false;

      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      this.videoElement.nativeElement.srcObject = this.videoStream;
      this.videoElement.nativeElement.setAttribute('playsinline', 'true');
      
      this.videoElement.nativeElement.onplaying = () => {
        this.setupScannerUI();
        this.scanQRCode();
      };
      
      this.videoElement.nativeElement.play();
    } catch (err) {
      console.error('Error accessing camera: ', err);
      alert('Unable to access camera: ' + (err as Error).message);
      this.stopCamera();
    }
  }

  setupScannerUI(): void {
    setTimeout(() => {
      if (this.isScanning && this.videoElement) {
        const video = this.videoElement.nativeElement;
        const canvas = this.canvasElement.nativeElement;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
      }
    }, 100);
  }

  stopCamera(): void {
    this.isScanning = false;
    this.scanStatus = '';
    if (this.scanningInterval) {
      cancelAnimationFrame(this.scanningInterval);
    }
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
    if (this.videoElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
  }

  scanQRCode(): void {
    if (!this.isScanning) return;
    
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      if (this.jsQRLoaded && typeof jsQR !== 'undefined') {
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        if (code) {
          this.drawRect(code.location, ctx);
          this.onCodeScanned(code.data);
        } else {
          this.scanStatus = 'Scanning...';
          this.scanStatusClass = 'status-scanning';
        }
      }
    }

    if (this.isScanning) {
      this.scanningInterval = requestAnimationFrame(() => this.scanQRCode());
    }
  }

  drawRect(location: any, ctx: CanvasRenderingContext2D): void {
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#2563eb";
    ctx.beginPath();
    ctx.moveTo(location.topLeftCorner.x, location.topLeftCorner.y);
    ctx.lineTo(location.topRightCorner.x, location.topRightCorner.y);
    ctx.lineTo(location.bottomRightCorner.x, location.bottomRightCorner.y);
    ctx.lineTo(location.bottomLeftCorner.x, location.bottomLeftCorner.y);
    ctx.closePath();
    ctx.stroke();
  }

  onCodeScanned(result: string): void {
    try {
      const scannedData = JSON.parse(result);
      
      if (scannedData.user_id && scannedData.full_name) {
        this.stopCamera();
        this.fetchMedicalData(scannedData.user_id, scannedData);
      } else {
        this.scanStatus = 'Not a valid medical QR code';
        this.scanStatusClass = 'status-error';
        this.scanResultVisible = true;
      }
    } catch {
      const parsedData = this.parseTextData(result);
      if (parsedData && parsedData.user_id) {
        this.stopCamera();
        this.fetchMedicalData(parsedData.user_id, parsedData);
      } else {
        this.scannedData = { message: result };
        this.scanStatus = 'Not a medical QR code';
        this.scanStatusClass = 'status-error';
        this.scanResultVisible = true;
      }
    }
  }

  fetchMedicalData(userId: string, minimalData: any): void {
    this.scanStatus = 'Fetching medical data...';
    this.scanStatusClass = 'status-scanning';
    
    this.http.get(`${environment.apiUrl}/medical/${userId}`).subscribe({
      next: (res: any) => {
        if (res) {
          let profilePhoto = '';
          if (res.photo_url) {
            if (res.photo_url.startsWith('data:image/')) {
              profilePhoto = res.photo_url;
            } else if (res.photo_url.startsWith('http')) {
              profilePhoto = res.photo_url;
            } else {
              profilePhoto = `${environment.apiUrl}${res.photo_url}`;
            }
          }
          
          let formattedData = {
            ...minimalData,
            ...res,
            profile_photo: profilePhoto || minimalData.profile_photo
          };
          
          if (formattedData.dob) {
            formattedData.dob = this.formatDateForDisplay(formattedData.dob);
          }
          
          this.scannedData = this.ensureTimestamp(formattedData);
          this.originalData = JSON.parse(JSON.stringify(this.scannedData));
          
          this.scanStatus = 'Medical Data Retrieved!';
          this.scanStatusClass = 'status-success';
          this.scanResultVisible = true;
          
          setTimeout(() => {
            this.logActivity('SCAN', `Scanned medical QR for: ${minimalData.full_name}`);
          }, 100);
          
          setTimeout(() => {
            this.populateEditForm(this.scannedData);
            this.switchTab('edit');
          }, 1500);
        } else {
          this.scanStatus = 'Medical data not found';
          this.scanStatusClass = 'status-error';
          this.scanResultVisible = true;
        }
      },
      error: (err) => {
        console.error('Error fetching medical data:', err);
        this.scanStatus = 'Error fetching medical data';
        this.scanStatusClass = 'status-error';
        this.scanResultVisible = true;
        
        if (minimalData.full_name) {
          let fallbackData = minimalData;
          if (fallbackData.dob) {
            fallbackData.dob = this.formatDateForDisplay(fallbackData.dob);
          }
          this.scannedData = this.ensureTimestamp(fallbackData);
          this.scanStatus = 'Basic info loaded (full data unavailable)';
          this.scanStatusClass = 'status-success';
        }
      }
    });
  }

  parseTextData(text: string): any {
    const data: any = {};
    
    try {
      const jsonData = JSON.parse(text);
      if (jsonData.user_id || jsonData.full_name) {
        return jsonData;
      }
    } catch {
      // If not JSON, try text parsing
    }
    
    const nameMatch = text.match(/Name:([^\n\r]*)/i);
    if (nameMatch) data.full_name = nameMatch[1].trim();
    
    const userIdMatch = text.match(/User ID:([^\n\r]*)/i) || 
                       text.match(/user_id:([^\n\r]*)/i) || 
                       text.match(/userId:([^\n\r]*)/i);
    if (userIdMatch) data.user_id = userIdMatch[1].trim();
    
    const dobMatch = text.match(/DOB:([^\n\r]*)/i) || 
                     text.match(/Date of Birth:([^\n\r]*)/i) || 
                     text.match(/dob:([^\n\r]*)/i);
    if (dobMatch) {
      const dobValue = dobMatch[1].trim();
      data.dob = this.formatDateForDisplay(dobValue);
    }
    
    return (data.user_id || data.full_name) ? data : null;
  }

  ensureTimestamp(data: any): any {
    if (!data.lastUpdated || data.lastUpdated === 'Never') {
      return {
        ...data,
        lastUpdated: new Date().toISOString()
      };
    }
    return data;
  }

  // ==================== EDIT METHODS ====================

  populateEditForm(data: any): void {
    let dobForForm = data.dob;
    if (dobForForm && dobForForm.includes('/')) {
      const parts = dobForForm.split('/');
      if (parts.length === 3) {
        dobForForm = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
    }
    
    this.editForm.patchValue({
      full_name: data.full_name || '',
      dob: dobForForm || '',
      blood_type: data.blood_type || '',
      address: data.address || '',
      allergies: data.allergies || '',
      medications: data.medications || '',
      conditions: data.conditions || '',
      emergency_contact: data.emergency_contact || '',
      user_id: data.user_id || data.userId || ''
    });
    
    this.originalData = { ...data };
    this.isEditing = true;
    
    console.log('✅ Edit form populated with data:', {
      name: data.full_name,
      user_id: data.user_id,
      hasPhoto: !!data.profile_photo,
      photoType: data.profile_photo ? (data.profile_photo.startsWith('data:') ? 'base64' : 'url') : 'none'
    });
  }

  onPhotoUpload(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.uploadPreview.nativeElement.src = e.target.result;
        this.uploadPreview.nativeElement.style.display = 'block';
        this.scanUploadedPhoto(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  scanUploadedPhoto(imageSrc: string): void {
    this.scanStatus = 'Processing uploaded image...';
    this.scanStatusClass = 'status-scanning';
    this.scanResultVisible = false;
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      if (this.jsQRLoaded && typeof jsQR !== 'undefined') {
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        if (code) {
          this.onCodeScanned(code.data);
        } else {
          this.scanStatus = 'No QR code found';
          this.scanStatusClass = 'status-error';
          alert("No QR code found in the uploaded image. Please try another image.");
        }
      } else {
        this.scanStatus = 'Scanner not ready';
        this.scanStatusClass = 'status-error';
        alert("QR scanner is not ready yet. Please try again in a moment.");
      }
      
      setTimeout(() => {
        if (this.scanStatusClass === 'status-error') {
          this.scanStatus = '';
        }
      }, 3000);
    };
    
    img.src = imageSrc;
  }

  triggerPhotoUpload(): void {
    const input = document.getElementById('photoUpload') as HTMLInputElement;
    if (input) input.click();
  }

  saveChanges(): void {
    if (this.editForm.invalid) {
      alert('Please fill all required fields');
      return;
    }
    
    const formData = this.editForm.value;
    const currentTimestamp = new Date().toISOString();
    
    if (!formData.user_id) {
      this.findUserIdByMedicalInfo(formData).then(userId => {
        if (userId) {
          this.performUpdate({ ...formData, user_id: userId }, currentTimestamp);
        } else {
          console.warn('User ID not found, attempting update with medical info only');
          this.performUpdate({ ...formData }, currentTimestamp);
        }
      }).catch(error => {
        console.error('Error finding user ID:', error);
        this.performUpdate({ ...formData }, currentTimestamp);
      });
    } else {
      this.performUpdate({ ...formData }, currentTimestamp);
    }
  }

  async findUserIdByMedicalInfo(medicalData: any): Promise<string> {
    try {
      const response: any = await this.http.post(`${environment.apiUrl}/admin/find-user-by-medical`, {
        full_name: medicalData.full_name,
        dob: medicalData.dob
      }).toPromise();

      if (response && response.user_id) {
        return response.user_id;
      } else {
        throw new Error('User ID not found in response');
      }
    } catch (error: any) {
      console.error('Error finding user by medical info:', error);
      
      if (error.status === 404) {
        throw new Error('MEDICAL_RECORD_NOT_FOUND');
      } else {
        throw new Error('SERVER_ERROR');
      }
    }
  }

  performUpdate(updateData: any, timestamp: string): void {
    const payload = {
      ...updateData,
      lastUpdated: timestamp,
      admin_id: this.adminId
    };

    this.http.put(`${environment.apiUrl}/admin/update-medical/${updateData.user_id}`, payload).subscribe({
      next: (res: any) => {
        const isSuccess = this.checkUpdateSuccess(res);
        
        if (isSuccess) {
          const updatedTimestamp = res.lastUpdated || res.timestamp || timestamp;
          
          // FIXED: Only log actual changes, not false positives
          const actualChanges = this.getActualChangedFields();
          if (actualChanges) {
            this.logActivity('UPDATE', `Updated medical information for user: ${updateData.full_name}`, actualChanges);
          } else {
            console.log('🔄 No actual changes detected, skipping activity log');
          }
          
          this.forceUserDataRefresh(updateData.user_id);
          
          alert(`Medical information updated successfully!\nLast updated: ${this.formatLastUpdated(updatedTimestamp)}`);
          
          this.resetScanner();
          this.switchTab('scanner');
        } else {
          if (this.looksLikeSuccess(res)) {
            const updatedTimestamp = res.lastUpdated || res.timestamp || timestamp;
            
            // FIXED: Only log actual changes, not false positives
            const actualChanges = this.getActualChangedFields();
            if (actualChanges) {
              this.logActivity('UPDATE', `Updated medical information for user: ${updateData.full_name}`, actualChanges);
            } else {
              console.log('🔄 No actual changes detected, skipping activity log');
            }
            
            this.forceUserDataRefresh(updateData.user_id);
            
            alert(`Medical information updated successfully!\nLast updated: ${this.formatLastUpdated(updatedTimestamp)}`);
            
            this.resetScanner();
            this.switchTab('scanner');
          } else {
            const errorMsg = res.message || 'Update failed for unknown reason';
            alert('Update failed: ' + errorMsg);
          }
        }
      },
      error: (err) => {
        let errorMessage = 'Failed to update medical information';
        
        if (err.status === 0) {
          errorMessage += ': Cannot connect to server. Please check your internet connection.';
        } else if (err.status === 404) {
          errorMessage += ': Medical record not found. Please ensure the patient exists in the system.';
        } else if (err.status === 400) {
          errorMessage += ': Invalid data. Please check all required fields.';
        } else if (err.status === 401 || err.status === 403) {
          errorMessage += ': Permission denied. Please check your admin credentials.';
        } else if (err.status === 500) {
          errorMessage += ': Server error. Please try again later.';
        } else if (err.error?.message) {
          errorMessage += ': ' + err.error.message;
        } else if (err.message) {
          errorMessage += ': ' + err.message;
        } else {
          errorMessage += '. Please try again.';
        }
        
        alert(errorMessage);
      }
    });
  }

  private checkUpdateSuccess(response: any): boolean {
    if (!response) return false;
    
    if (response.success === true) return true;
    if (response.status === 'success') return true;
    if (response.updated === true) return true;
    if (response.message?.toLowerCase().includes('success')) return true;
    if (response.message?.toLowerCase().includes('updated')) return true;
    
    return false;
  }

  private looksLikeSuccess(response: any): boolean {
    if (!response) return false;
    
    if (response.success === false) {
      const message = (response.message || '').toLowerCase();
      return message.includes('success') || 
             message.includes('updated') || 
             message.includes('saved') ||
             message.includes('completed');
    }
    
    return false;
  }

  forceUserDataRefresh(userId: string): void {
    if (!userId) return;
    
    this.http.post(`${environment.apiUrl}/admin/refresh-user-data`, { 
      user_id: userId 
    }).subscribe({
      next: (res: any) => {
        console.log('User data refresh triggered for:', userId);
      },
      error: (err) => {
        console.error('Error triggering user data refresh:', err);
      }
    });
  }

  // FIXED: Improved change detection to avoid false positives
  getActualChangedFields(): string {
    if (!this.originalData) return '';
    
    const changes: string[] = [];
    const formData = this.editForm.value;
    
    // Compare each field and only include actual meaningful changes
    Object.keys(formData).forEach(key => {
      const originalValue = this.originalData[key];
      const newValue = formData[key];
      
      // Skip user_id field from comparison
      if (key === 'user_id') return;
      
      // Handle date comparison - normalize dates for comparison
      if (key === 'dob') {
        const originalDate = this.normalizeDate(originalValue);
        const newDate = this.normalizeDate(newValue);
        if (originalDate !== newDate) {
          changes.push(key);
        }
      } 
      // Handle empty string vs null/undefined comparison
      else if ((!originalValue && newValue) || (originalValue && !newValue)) {
        changes.push(key);
      }
      // Handle string comparison with trimming
      else if (originalValue?.toString().trim() !== newValue?.toString().trim()) {
        changes.push(key);
      }
    });
    
    console.log('🔄 Detected actual changes:', changes);
    return changes.join(', ');
  }

  // Helper method to normalize dates for comparison
  private normalizeDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      // Handle both "MM/DD/YYYY" and "YYYY-MM-DD" formats
      if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
      }
      
      // If it's already in YYYY-MM-DD format or invalid, return as is
      return dateString;
    } catch (e) {
      console.error('Error normalizing date:', e);
      return dateString;
    }
  }

  // Keep original method for backward compatibility
  getChangedFields(): string {
    return this.getActualChangedFields();
  }

  cancelEdit(): void {
    this.resetScanner();
    this.switchTab('scanner');
  }

  resetScanner(): void {
    this.scannedData = null;
    this.isEditing = false;
    this.originalData = null;
    this.editForm.reset();
    this.scanResultVisible = false;
    this.scanStatus = '';
  }

  formatLastUpdated(timestamp: string): string {
    if (!timestamp || timestamp === 'Never') return 'Never';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return timestamp;
      }
      
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      console.error('Error formatting timestamp:', e);
      return timestamp;
    }
  } 

  logout(): void {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    localStorage.removeItem('admin_id');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('current_admin');
    this.router.navigate(['/admin-login']);
  }
}
