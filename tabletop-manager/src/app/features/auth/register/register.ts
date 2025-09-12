import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

// Custom validator for password confirmation
function passwordMatchValidator(control: AbstractControl) {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  
  if (!password || !confirmPassword) {
    return null;
  }
  
  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCheckboxModule
  ]
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  
  registerForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);

  constructor(private fb: FormBuilder) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, { validators: passwordMatchValidator });
  }

  async onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      try {
        const { email, password } = this.registerForm.value;
        
        // Call the real AuthService
        const result = await this.authService.signUp(email, password);
        
        if (result.success) {
          // Show success message
          this.snackBar.open(
            'Registration successful! Please check your email to verify your account.',
            'Close',
            { duration: 5000 }
          );
          
          // Navigate to login
          this.router.navigate(['/login'], { 
            queryParams: { 
              registered: 'true',
              email: email 
            }
          });
        } else {
          this.errorMessage.set(result.error || 'Registration failed. Please try again.');
        }
      } catch (error) {
        console.error('Registration error:', error);
        this.errorMessage.set('An unexpected error occurred. Please try again.');
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  togglePasswordVisibility() {
    this.hidePassword.set(!this.hidePassword());
  }

  toggleConfirmPasswordVisibility() {
    this.hideConfirmPassword.set(!this.hideConfirmPassword());
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}