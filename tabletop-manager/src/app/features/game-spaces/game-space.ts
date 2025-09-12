// src/app/core/services/game-space.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from '../../core/services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface GameSpace {
  id: string;
  name: string;
  description?: string;
  gm_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  game_space_id: string;
  name: string;
  character_type: 'pc' | 'npc';
  owner_user_id?: string;
  character_data: any;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GameSession {
  id: string;
  game_space_id: string;
  name: string;
  status: 'planning' | 'active' | 'completed';
  participants: string[];
  session_data: any;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameSpaceService implements OnDestroy {
  private currentGameSpaceId: string | null = null;
  private gameSpaceChannel: RealtimeChannel | null = null;
  private charactersSubject = new BehaviorSubject<Character[]>([]);
  private sessionSubject = new BehaviorSubject<GameSession | null>(null);

  public characters$ = this.charactersSubject.asObservable();
  public currentSession$ = this.sessionSubject.asObservable();

  constructor(private supabase: SupabaseService) {}

  // Get user's game spaces
  async getGameSpaces(): Promise<GameSpace[]> {
    const { data, error } = await this.supabase.client
      .from('game_spaces')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Join a specific game space and set up realtime subscriptions
  async joinGameSpace(gameSpaceId: string): Promise<void> {
    // Clean up previous subscription
    if (this.gameSpaceChannel && this.currentGameSpaceId !== gameSpaceId) {
      await this.leaveGameSpace();
    }

    this.currentGameSpaceId = gameSpaceId;

    // Create dedicated channel for this game space (following best practices)
    this.gameSpaceChannel = this.supabase.createChannel(
      `game_space:${gameSpaceId}:characters`,
      true // private channel
    );

    // Subscribe to character changes
    this.gameSpaceChannel
      .on('broadcast', { event: 'character_insert' }, (payload) => {
        console.log('Character created:', payload);
        this.handleCharacterChange('insert', payload['payload']);
      })
      .on('broadcast', { event: 'character_update' }, (payload) => {
        console.log('Character updated:', payload);
        this.handleCharacterChange('update', payload['payload']);
      })
      .on('broadcast', { event: 'character_delete' }, (payload) => {
        console.log('Character deleted:', payload);
        this.handleCharacterChange('delete', payload['payload']);
      });

    try {
      await this.supabase.subscribeToChannel(this.gameSpaceChannel);
      
      // Load initial data after successful subscription
      await this.loadGameSpaceData(gameSpaceId);
      
      // Set up session tracking
      await this.subscribeToSessions(gameSpaceId);
      
    } catch (error) {
      console.error('Failed to join game space:', error);
      throw error;
    }
  }

  // Subscribe to session changes (combat tracker, etc.)
  private async subscribeToSessions(gameSpaceId: string): Promise<void> {
    const sessionChannel = this.supabase.createChannel(
      `game_space:${gameSpaceId}:sessions`,
      true
    );

    sessionChannel
      .on('broadcast', { event: 'session_status_changed' }, (payload) => {
        console.log('Session status changed:', payload);
        this.handleSessionChange(payload['payload']);
      })
      .on('broadcast', { event: 'session_data_updated' }, (payload) => {
        console.log('Session data updated (combat tracker):', payload);
        this.handleSessionChange(payload['payload']);
      });

    await this.supabase.subscribeToChannel(sessionChannel);
  }

  // Load initial game space data
  private async loadGameSpaceData(gameSpaceId: string): Promise<void> {
    // Load characters
    const { data: characters, error: charactersError } = await this.supabase.client
      .from('characters')
      .select('*')
      .eq('game_space_id', gameSpaceId)
      .eq('is_active', true)
      .order('name');

    if (charactersError) {
      console.error('Error loading characters:', charactersError);
    } else {
      this.charactersSubject.next(characters || []);
    }

    // Load active session
    const { data: session, error: sessionError } = await this.supabase.client
      .from('game_sessions')
      .select('*')
      .eq('game_space_id', gameSpaceId)
      .eq('status', 'active')
      .single();

    if (sessionError && sessionError.code !== 'PGRST116') { // Not found is OK
      console.error('Error loading session:', sessionError);
    } else if (session) {
      this.sessionSubject.next(session);
    }
  }

  // Handle character changes from realtime
  private handleCharacterChange(operation: string, payload: any): void {
    const currentCharacters = this.charactersSubject.value;
    
    switch (operation) {
      case 'insert':
        if (payload.new) {
          this.charactersSubject.next([...currentCharacters, payload.new]);
        }
        break;
      case 'update':
        if (payload.new) {
          const updated = currentCharacters.map(char => 
            char.id === payload.new.id ? payload.new : char
          );
          this.charactersSubject.next(updated);
        }
        break;
      case 'delete':
        if (payload.old) {
          const filtered = currentCharacters.filter(char => char.id !== payload.old.id);
          this.charactersSubject.next(filtered);
        }
        break;
    }
  }

  // Handle session changes from realtime
  private handleSessionChange(payload: any): void {
    if (payload.new) {
      this.sessionSubject.next(payload.new);
    }
  }

  // Create a new character
  async createCharacter(characterData: Partial<Character>): Promise<Character> {
    const { data, error } = await this.supabase.client
      .from('characters')
      .insert([{
        game_space_id: this.currentGameSpaceId,
        ...characterData
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update character
  async updateCharacter(characterId: string, updates: Partial<Character>): Promise<void> {
    const { error } = await this.supabase.client
      .from('characters')
      .update(updates)
      .eq('id', characterId);

    if (error) throw error;
  }

  // Start a game session
  async startGameSession(sessionName: string, participantIds: string[]): Promise<GameSession> {
    const { data, error } = await this.supabase.client
      .from('game_sessions')
      .insert([{
        game_space_id: this.currentGameSpaceId,
        name: sessionName,
        status: 'active',
        participants: participantIds,
        session_data: {
          combat_tracker: [],
          current_round: 0,
          active_character_index: 0
        },
        started_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update session data (combat tracker, etc.)
  async updateSessionData(sessionData: any): Promise<void> {
    const currentSession = this.sessionSubject.value;
    if (!currentSession) throw new Error('No active session');

    const { error } = await this.supabase.client
      .from('game_sessions')
      .update({ 
        session_data: sessionData,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentSession.id);

    if (error) throw error;
  }

  // Leave game space and clean up
  async leaveGameSpace(): Promise<void> {
    if (this.gameSpaceChannel) {
      this.supabase.removeChannel(`game_space:${this.currentGameSpaceId}:characters`);
      this.supabase.removeChannel(`game_space:${this.currentGameSpaceId}:sessions`);
    }
    
    this.currentGameSpaceId = null;
    this.gameSpaceChannel = null;
    this.charactersSubject.next([]);
    this.sessionSubject.next(null);
  }

  ngOnDestroy(): void {
    this.leaveGameSpace();
  }
}