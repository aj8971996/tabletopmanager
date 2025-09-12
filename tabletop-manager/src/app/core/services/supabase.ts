// src/app/core/services/supabase.service.ts
import { Injectable } from '@angular/core';
import { 
  createClient, 
  SupabaseClient, 
  AuthChangeEvent, 
  AuthSession,
  RealtimeChannel 
} from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private channels: Map<string, RealtimeChannel> = new Map();

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  get client() {
    return this.supabase;
  }

  // Authentication methods
  async signUp(email: string, password: string) {
    return await this.supabase.auth.signUp({ email, password });
  }

  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return await this.supabase.auth.signOut();
  }

  async getSession() {
    const { data } = await this.supabase.auth.getSession();
    return data.session;
  }

  // Channel management following best practices
  createChannel(topic: string, isPrivate = true): RealtimeChannel {
    // Check if channel already exists to prevent duplicates
    if (this.channels.has(topic)) {
      return this.channels.get(topic)!;
    }

    const channel = this.supabase.channel(topic, {
      config: {
        broadcast: { self: true, ack: true },
        presence: { key: 'user-session-id' },
        private: isPrivate  // Following best practice of using private channels
      }
    });

    this.channels.set(topic, channel);
    return channel;
  }

  async subscribeToChannel(channel: RealtimeChannel): Promise<void> {
    // Set auth before subscribing (required for private channels)
    await this.supabase.realtime.setAuth();
    
    return new Promise((resolve, reject) => {
      channel.subscribe((status, err) => {
        switch (status) {
          case 'SUBSCRIBED':
            console.log('Connected to channel:', channel.topic);
            resolve();
            break;
          case 'CHANNEL_ERROR':
            console.error('Channel error:', err);
            reject(err);
            break;
        }
      });
    });
  }

  removeChannel(topic: string): void {
    const channel = this.channels.get(topic);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.channels.delete(topic);
    }
  }

  // Clean up all channels (call this on app destroy)
  cleanup(): void {
    this.channels.forEach((channel, topic) => {
      this.supabase.removeChannel(channel);
    });
    this.channels.clear();
  }
}