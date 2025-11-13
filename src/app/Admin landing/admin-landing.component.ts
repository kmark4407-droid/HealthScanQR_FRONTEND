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

  // Logs variables - FIXED: Added proper initialization
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

  // Admin info
  adminName: string = 'Administrator';
  adminId: string = '';
  currentAdmin: any = null;
  jsQRLoaded: boolean = false;

  // Search debounce
  private searchTimeout: any;

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
    this.adminId = localStorage.getItem('admin_id') || '';
    const storedName = localStorage.getItem('admin_name');
    const storedAdmin = localStorage.getItem('current_admin');
    
    if (storedAdmin) {
      this.currentAdmin = JSON.parse(storedAdmin);
      this.adminName = this.currentAdmin.full_name || this.currentAdmin.email || 'Administrator';
    } else if (storedName) {
      this.adminName = storedName;
    }
    
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
    // Only close hamburger menu on mobile screens
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
    // Only toggle hamburger menu on mobile screens
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
    
    // Auto-close hamburger menu when a tab is selected (mobile only)
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
  }

  // ==================== LOGS METHODS - FIXED ====================

  loadActivityLogs(): void {
    this.logsLoading = true;
    this.logsError = '';
    
    console.log('🔄 Loading activity logs...');
    console.log('🔑 Admin ID:', this.adminId);

    // Build the URL with query parameters
    const url = `${environment.apiUrl}/admin/activity-logs?admin_id=${this.adminId}`;
    console.log('📡 Request URL:', url);

    this.http.get(url).subscribe({
      next: (res: any) => {
        console.log('✅ Activity logs response:', res);
        
        if (res && res.logs) {
          this.activityLogs = res.logs.map((log: any) => ({
            ...log,
            description: this.removeUserIdFromDescription(log.description || '')
          }));
          this.filteredLogs = [...this.activityLogs];
          console.log(`📊 Loaded ${this.activityLogs.length} activity logs`);
        } else if (res && Array.isArray(res)) {
          // Handle case where response is directly an array
          this.activityLogs = res.map((log: any) => ({
            ...log,
            description: this.removeUserIdFromDescription(log.description || '')
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
        this.logsError = this.getErrorMessage(err);
        this.activityLogs = [];
        this.filteredLogs = [];
        this.logsLoading = false;
        
        // Try alternative endpoint as fallback
        this.tryAlternativeLogsEndpoint();
      }
    });
  }

  private tryAlternativeLogsEndpoint(): void {
    console.log('🔄 Trying alternative logs endpoint...');
    
    this.http.get(`${environment.apiUrl}/admin/logs`).subscribe({
      next: (res: any) => {
        console.log('✅ Alternative logs response:', res);
        
        if (res && res.logs) {
          this.activityLogs = res.logs.map((log: any) => ({
            ...log,
            description: this.removeUserIdFromDescription(log.description || '')
          }));
          this.filteredLogs = [...this.activityLogs];
          console.log(`📊 Loaded ${this.activityLogs.length} logs from alternative endpoint`);
        }
      },
      error: (err) => {
        console.error('❌ Alternative endpoint also failed:', err);
      }
    });
  }

  private getErrorMessage(error: any): string {
    if (error.status === 0) {
      return 'Cannot connect to server. Please check if the server is running.';
    } else if (error.status === 404) {
      return 'Logs endpoint not found. The server might need to be updated.';
    } else if (error.status === 401) {
      return 'Authentication required. Please log in again.';
    } else if (error.error?.message) {
      return error.error.message;
    } else {
      return 'Failed to load activity logs. Please try again.';
    }
  }

  removeUserIdFromDescription(description: string): string {
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
    let cleanChanges = changes;
    if (changes) {
      cleanChanges = this.removeUserIdFromDescription(changes);
    }
    
    let cleanDescription = this.removeUserIdFromDescription(description);
    
    const log = {
      action,
      description: cleanChanges ? `${cleanDescription} - Changed: ${cleanChanges}` : cleanDescription,
      admin_id: this.adminId,
      admin_name: this.adminName,
      timestamp: new Date().toISOString()
    };

    console.log('📝 Logging activity:', log);

    this.http.post(`${environment.apiUrl}/admin/log-activity`, log).subscribe({
      next: (res: any) => {
        console.log('✅ Activity logged successfully');
        // Reload logs to show the new entry
        this.loadActivityLogs();
      },
      error: (err) => {
        console.error('❌ Error logging activity:', err);
        // Even if logging fails, we can still reload the existing logs
        this.loadActivityLogs();
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
          console.log('✅ Logs cleared successfully');
          this.activityLogs = [];
          this.filteredLogs = [];
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

    const csvContent = this.convertToCSV(this.filteredLogs);
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

  convertToCSV(logs: any[]): string {
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

  // ==================== USER MANAGEMENT METHODS - FIXED ====================

  switchUserManagementTab(tabName: string): void {
    this.userManagementTab = tabName;
    this.selectedUser = null;
    this.showUserDetails = false;
    
    console.log(`🔄 Switched to ${tabName} tab`);
    console.log(`📊 Approved users: ${this.approvedUsers.length}, Pending users: ${this.pendingUsers.length}`);
  }

  loadUsers(): void {
    this.http.get(`${environment.apiUrl}/admin/users`).subscribe({
      next: (res: any) => {
        this.users = res.users || [];
        console.log('📊 Loaded users:', this.users.length);
        
        // Initialize filteredUsers with all users
        this.filteredUsers = [...this.users];
        
        // FIXED: Properly separate approved and pending users
        this.separateUsersByApproval();
      },
      error: (err) => {
        console.error('Error loading users:', err);
        alert('Failed to load users. Please try again.');
      }
    });
  }

  // NEW METHOD: Properly separate users by approval status
  private separateUsersByApproval(): void {
    // Clear both arrays first
    this.approvedUsers = [];
    this.pendingUsers = [];
    
    // Use filteredUsers for the current view, or all users if no filter
    const usersToSeparate = this.filteredUsers.length > 0 ? this.filteredUsers : this.users;
    
    // Separate users based on approval status
    usersToSeparate.forEach(user => {
      if (user) {
        // Check if user is explicitly approved (true)
        if (user.approved === true) {
          this.approvedUsers.push(user);
        } else {
          // Anything else (false, null, undefined, etc.) goes to pending
          this.pendingUsers.push(user);
        }
      }
    });
    
    console.log('🔄 Separated users - Approved:', this.approvedUsers.length, 'Pending:', this.pendingUsers.length);
  }

  // FIXED: Search functionality for user management
  filterUsers(): void {
    // Get the search term and trim it
    const term = this.userSearchTerm ? this.userSearchTerm.toLowerCase().trim() : '';
    
    if (!term) {
      // If no search term, show all users
      this.filteredUsers = [...this.users];
    } else {
      // Filter users based on search term
      this.filteredUsers = this.users.filter(user => {
        if (!user) return false;
        
        // Check various fields for matches
        const nameMatch = user.full_name && user.full_name.toLowerCase().includes(term);
        const emailMatch = user.email && user.email.toLowerCase().includes(term);
        const bloodTypeMatch = user.blood_type && user.blood_type.toLowerCase().includes(term);
        const addressMatch = user.address && user.address.toLowerCase().includes(term);
        
        return nameMatch || emailMatch || bloodTypeMatch || addressMatch;
      });
    }
    
    console.log('🔍 Search results:', {
      searchTerm: this.userSearchTerm,
      totalUsers: this.users.length,
      filteredUsers: this.filteredUsers.length,
      filteredUsersList: this.filteredUsers.map(u => u.full_name)
    });
    
    // After filtering, re-separate the users for the tabs
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

  clearSearch(): void {
    this.userSearchTerm = '';
    this.filterUsers();
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
          this.separateUsersByApproval(); // Re-separate to move user to approved list
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
          this.separateUsersByApproval(); // Re-separate to move user to pending list
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
    this.http.post(`${environment.apiUrl}/admin/delete-user`, {
      user_id: user.user_id,
      admin_id: this.adminId
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
    const usersToExport = this.filteredUsers.length > 0 ? this.filteredUsers : this.users;
    
    if (usersToExport.length === 0) {
      alert('No users to export.');
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

  getStatusText(user: any): string {
    if (user.approved === true) return 'Approved';
    return 'Pending Approval';
  }

  getUserInitials(user: any): string {
    if (!user.full_name) return 'U';
    return user.full_name
      .split(' ')
      .map((name: string) => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getProfilePhoto(user: any): string {
    if (!user) return '';
    
    let photoPath = user.profile_photo;
    
    if (photoPath && photoPath !== 'https://via.placeholder.com/200?text=No+Photo') {
      if (photoPath.startsWith('http')) {
        return photoPath;
      }
      
      const cleanPhotoPath = photoPath.trim();
      
      if (cleanPhotoPath.startsWith('/uploads/')) {
        return `${environment.apiUrl}${cleanPhotoPath}`;
      } else if (cleanPhotoPath.startsWith('uploads/')) {
        return `${environment.apiUrl}/${cleanPhotoPath}`;
      } else if (cleanPhotoPath.startsWith('/')) {
        return `${environment.apiUrl}${cleanPhotoPath}`;
      } else {
        return `${environment.apiUrl}/uploads/${cleanPhotoPath}`;
      }
    }
    
    return '';
  }

  handleImageError(event: any, user: any): void {
    console.warn('Failed to load profile photo for user:', user?.full_name);
    
    const imgElement = event.target;
    const avatarContainer = imgElement.closest('.user-avatar') || imgElement.closest('.user-profile-avatar');
    
    if (avatarContainer) {
      imgElement.style.display = 'none';
      
      const initialsElement = avatarContainer.querySelector('.initials');
      if (initialsElement) {
        initialsElement.style.display = 'flex';
      }
    }
  }

  // Debug method to check user status
  debugUserStatus(): void {
    console.log('=== USER STATUS DEBUG ===');
    console.log('Total users:', this.users.length);
    
    const approvedCount = this.users.filter(u => u && u.approved === true).length;
    const pendingCount = this.users.filter(u => u && u.approved !== true).length;
    
    console.log('Approved users:', approvedCount);
    console.log('Pending users:', pendingCount);
    
    // Log all users with their approval status
    this.users.forEach((user, index) => {
      console.log(`User ${index}:`, {
        name: user.full_name,
        email: user.email,
        approved: user.approved,
        approvedType: typeof user.approved
      });
    });
    
    console.log('Current tab:', this.userManagementTab);
    console.log('Approved users array:', this.approvedUsers.length);
    console.log('Pending users array:', this.pendingUsers.length);
  }

  // ==================== PROFILE PHOTO METHODS - FIXED ====================

  changeUserProfile(userId: string, photoFile: File): void {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('profile_photo', photoFile);

    console.log('📸 Changing profile photo for user:', userId);
    console.log('📁 File details:', {
      name: photoFile.name,
      type: photoFile.type,
      size: photoFile.size
    });

    this.http.post(`${environment.apiUrl}/admin/change-user-profile`, formData).subscribe({
      next: (res: any) => {
        console.log('✅ Profile photo update response:', res);
        if (res.success) {
          console.log('✅ Profile photo updated successfully');
          this.logActivity('PROFILE_UPDATE', `Changed profile photo for user ID: ${userId}`);
          alert('Profile photo updated successfully!');
          
          // Refresh user data
          this.loadUsers();
          
          // If we're currently viewing this user's details, update them
          if (this.selectedUser && this.selectedUser.user_id === userId) {
            this.selectedUser.profile_photo = res.new_photo_url;
          }
          
          // Update scanned data if it's the same user
          if (this.scannedData && this.scannedData.user_id === userId) {
            this.scannedData.profile_photo = res.new_photo_url;
          }
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
        // Validate file type and size
        if (!file.type.startsWith('image/')) {
          alert('Please select a valid image file (JPEG, PNG, etc.)');
          return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
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
        this.fetchMedicalData(scannedData.user_id, scannedData);
      } else {
        this.scanStatus = 'Not a valid medical QR code';
        this.scanStatusClass = 'status-error';
        this.scanResultVisible = true;
      }
    } catch {
      const parsedData = this.parseTextData(result);
      if (parsedData && parsedData.user_id) {
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
          let formattedData = {
            ...minimalData,
            ...res,
            profile_photo: res.photo_url ? `${environment.apiUrl}${res.photo_url}` : minimalData.profile_photo
          };
          
          if (formattedData.dob) {
            formattedData.dob = this.formatDateForDisplay(formattedData.dob);
          }
          
          this.scannedData = this.ensureTimestamp(formattedData);
          this.originalData = JSON.parse(JSON.stringify(this.scannedData));
          
          this.scanStatus = 'Medical Data Retrieved!';
          this.scanStatusClass = 'status-success';
          this.scanResultVisible = true;
          
          this.logActivity('SCAN', `Scanned medical QR for: ${minimalData.full_name}`);
          
          setTimeout(() => {
            this.stopCamera();
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

  formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        const parts = dateString.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const day = parseInt(parts[2]);
          const newDate = new Date(year, month, day);
          if (!isNaN(newDate.getTime())) {
            return this.formatDateAsMDY(newDate);
          }
        }
        return dateString;
      }
      
      return this.formatDateAsMDY(date);
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString;
    }
  }

  private formatDateAsMDY(date: Date): string {
    const month = (date.getMonth() + 1).toString();
    const day = date.getDate().toString();
    const year = date.getFullYear().toString();
    
    return `${month}/${day}/${year}`;
  }

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

  // ==================== EDIT METHODS ====================

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

    this.http.post(`${environment.apiUrl}/admin/update-medical`, payload).subscribe({
      next: (res: any) => {
        const isSuccess = this.checkUpdateSuccess(res);
        
        if (isSuccess) {
          const updatedTimestamp = res.lastUpdated || res.timestamp || timestamp;
          
          this.logActivity('UPDATE', `Updated medical information for user: ${updateData.full_name}`, this.getChangedFields());
          
          this.forceUserDataRefresh(updateData.user_id);
          
          alert(`Medical information updated successfully!\nLast updated: ${this.formatLastUpdated(updatedTimestamp)}`);
          
          this.resetScanner();
          this.switchTab('scanner');
        } else {
          if (this.looksLikeSuccess(res)) {
            const updatedTimestamp = res.lastUpdated || res.timestamp || timestamp;
            
            this.logActivity('UPDATE', `Updated medical information for user: ${updateData.full_name}`, this.getChangedFields());
            
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

  ensureTimestamp(data: any): any {
    if (!data.lastUpdated || data.lastUpdated === 'Never') {
      return {
        ...data,
        lastUpdated: new Date().toISOString()
      };
    }
    return data;
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

  getChangedFields(): string {
    if (!this.originalData) return '';
    
    const changes: string[] = [];
    Object.keys(this.editForm.value).forEach(key => {
      if (this.editForm.value[key] !== this.originalData[key]) {
        changes.push(key);
      }
    });
    return changes.join(', ');
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
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin_id');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('current_admin');
    this.router.navigate(['/admin-login']);
  }
}