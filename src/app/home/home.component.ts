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
      description: 'Critical medical information instantly available to authorized responders'
    },
    {
      title: 'Secure & Encrypted',
      description: 'HIPAA-compliant protection for all patient data'
    },
    {
      title: 'Mobile Optimized',
      description: 'Access medical profiles from any device'
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
