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
      icon: 'fas fa-qrcode',
      title: 'Quick QR Scanning',
      description: 'Instantly access medical information with a single scan'
    },
    {
      icon: 'fas fa-shield-alt',
      title: 'Secure & Private',
      description: 'Enterprise-grade security to protect sensitive health data'
    },
    {
      icon: 'fas fa-bolt',
      title: 'Instant Access',
      description: 'Emergency responders get critical info in seconds'
    },
    {
      icon: 'fas fa-mobile-alt',
      title: 'Mobile First',
      description: 'Access your medical profile from any device'
    }
  ];

  testimonials = [
    {
      quote: 'HealthScanQR saved precious minutes during an emergency. Highly recommended!',
      author: 'Dr. Sarah Johnson',
      role: 'Emergency Physician'
    },
    {
      quote: 'Finally, a simple solution for managing medical information securely.',
      author: 'Michael Chen',
      role: 'Diabetes Patient'
    },
    {
      quote: 'The QR system integrates perfectly with our hospital workflow.',
      author: 'Robert Davis',
      role: 'Hospital Administrator'
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
