// app.routes.ts
import { Routes } from '@angular/router';

// ✅ User Components
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { LandingComponent } from './landing/landing.component';
import { UpdateInfoComponent } from './create-med/update.component';

// ✅ Admin Components
import { AdminLoginComponent } from './Admin/Admin Login Component';
import { AdminLandingComponent } from './Admin landing/admin-landing.component';

// ✅ Guards
import { authGuard } from './auth/auth.guard';
import { adminGuard } from './auth/admin.guard';
import { updateInfoGuard } from './auth/update-info.guard';

export const routes: Routes = [
  // Public routes
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'admin-login', component: AdminLoginComponent },

  // Protected Admin route
  { path: 'admin', component: AdminLandingComponent, canActivate: [adminGuard] },
  { path: 'Admin', redirectTo: 'admin', pathMatch: 'full' },

  // Protected User routes
  { path: 'update-info', component: UpdateInfoComponent, canActivate: [authGuard, updateInfoGuard] },
  { path: 'landing', component: LandingComponent, canActivate: [authGuard] },

  // Default redirects
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];