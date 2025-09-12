import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  loginForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');
  hidePassword = signal(true);

  constructor(private fb: FormBuilder) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      try {
        const { email, password } = this.loginForm.value;
        
        // Call the real AuthService
        const result = await this.authService.signIn(email, password);
        
        if (result.success) {
          // AuthService already handles navigation to dashboard
          // No need to navigate here
          console.log('Login successful');
        } else {
          this.errorMessage.set(result.error || 'Login failed. Please try again.');
        }
      } catch (error) {
        console.error('Login error:', error);
        this.errorMessage.set('An unexpected error occurred. Please try again.');
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  togglePasswordVisibility() {
    this.hidePassword.set(!this.hidePassword());
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  skipToDashboard() {
    // For testing only - remove in production
    this.router.navigate(['/dashboard']);
  }
}