import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase';
import { AuthUser, AppUser } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  
  // Private signals
  private currentUserSignal = signal<AuthUser | null>(null);
  private loadingSignal = signal(false);

  // Public computed signals
  public currentUser = computed(() => this.currentUserSignal());
  public isAuthenticated = computed(() => !!this.currentUserSignal());
  public isLoading = computed(() => this.loadingSignal());
    currentUser$: any;

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    this.loadingSignal.set(true);

    try {
      // Subscribe to auth state changes from SupabaseService
      this.supabaseService.currentUser$.subscribe(user => {
        if (user) {
          this.currentUserSignal.set({
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata
          });
        } else {
          this.currentUserSignal.set(null);
        }
        this.loadingSignal.set(false);
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      this.loadingSignal.set(false);
    }
  }

  async signUp(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    this.loadingSignal.set(true);

    try {
      const { data, error } = await this.supabaseService.signUp(email, password);

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        this.currentUserSignal.set({
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error during sign up:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    this.loadingSignal.set(true);

    try {
      const { data, error } = await this.supabaseService.signIn(email, password);

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        this.currentUserSignal.set({
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata
        });

        // Navigate to dashboard or home page after successful login
        await this.router.navigate(['/dashboard']);
      }

      return { success: true };
    } catch (error) {
      console.error('Error during sign in:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    this.loadingSignal.set(true);

    try {
      const { error } = await this.supabaseService.signOut();

      if (error) {
        return { success: false, error: error.message };
      }

      this.currentUserSignal.set(null);
      
      // Navigate to login page after successful logout
      await this.router.navigate(['/auth/login']);

      return { success: true };
    } catch (error) {
      console.error('Error during sign out:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabaseService.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error during password reset:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabaseService.client.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating password:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async updateProfile(updates: { email?: string; password?: string; data?: Record<string, any> }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabaseService.client.auth.updateUser(updates);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Utility method to check if user has specific role in a game space
  async getUserGameSpaceRole(gameSpaceId: string): Promise<'gm' | 'player' | null> {
    const currentUser = this.currentUserSignal();
    if (!currentUser) return null;

    try {
      const { data, error } = await this.supabaseService.client
        .from('game_space_members')
        .select('role')
        .eq('game_space_id', gameSpaceId)
        .eq('user_id', currentUser.id)
        .single();

      if (error || !data) {
        return null;
      }

      return data.role;
    } catch (error) {
      console.error('Error checking game space role:', error);
      return null;
    }
  }
}