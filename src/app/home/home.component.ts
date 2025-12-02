import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  features = [
    {
      title: 'Emergency Access',
      description: 'Critical medical information instantly available to authorized responders with zero delays'
    },
    {
      title: 'Military-Grade Security',
      description: 'End-to-end HIPAA-compliant encryption with multi-factor authentication'
    },
    {
      title: 'Real-time Updates',
      description: 'Dynamic QR codes update automatically with latest medical information'
    },
    {
      title: 'Cross-platform Access',
      description: 'Accessible on any device with instant scanning capability'
    }
  ];

  constructor(private router: Router) {}

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }
}
