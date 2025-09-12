import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../enviornments/enviornment';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );

    // Initialize auth state
    this.initializeAuth();
  }

  private async initializeAuth() {
    const { data: { session } } = await this.supabase.auth.getSession();
    this.currentUserSubject.next(session?.user ?? null);

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUserSubject.next(session?.user ?? null);
    });
  }

  // Auth methods
  async signUp(email: string, password: string) {
    return await this.supabase.auth.signUp({ email, password });
  }

  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return await this.supabase.auth.signOut();
  }

  // Database access
  get client() {
    return this.supabase;
  }

  get auth() {
    return this.supabase.auth;
  }
}