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
  logoUrl = 'assets/images/healthscanqr1.png';
  
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
    },
    {
      icon: 'fas fa-history',
      title: 'Medical History',
      description: 'Complete medical records at your fingertips'
    },
    {
      icon: 'fas fa-ambulance',
      title: 'Emergency Ready',
      description: 'Critical information available when it matters most'
    }
  ];

  testimonials = [
    {
      quote: 'HealthScanQR saved precious minutes during an emergency. The accessibility of medical information through QR codes is revolutionary.',
      author: 'Dr. Sarah Johnson',
      role: 'Emergency Physician, St. Mary\'s Hospital'
    },
    {
      quote: 'As a diabetes patient, having my medical information instantly available gives me peace of mind during emergencies.',
      author: 'Michael Chen',
      role: 'Patient Advocate'
    },
    {
      quote: 'The system integrates perfectly with our hospital EMR workflow, reducing data retrieval time by 70%.',
      author: 'Robert Davis',
      role: 'CTO, Metropolitan Healthcare'
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
