import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase';
import { 
  GameSpace, 
  GameSpaceWithMembers, 
  CreateGameSpaceRequest,
  GameSession,
  CreateGameSessionRequest,
  UpdateGameSessionRequest,
  GameSpaceOption,
  CreateGameSpaceOptionRequest
} from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class GameSpaceService {
  private supabaseService = inject(SupabaseService);
  
  // Private signals
  private gameSpacesSignal = signal<GameSpaceWithMembers[]>([]);
  private currentGameSpaceSignal = signal<GameSpace | null>(null);
  private gameSessionsSignal = signal<GameSession[]>([]);
  private gameSpaceOptionsSignal = signal<GameSpaceOption[]>([]);
  private loadingSignal = signal(false);

  // Public computed signals
  public gameSpaces = computed(() => this.gameSpacesSignal());
  public currentGameSpace = computed(() => this.currentGameSpaceSignal());
  public gameSessions = computed(() => this.gameSessionsSignal());
  public gameSpaceOptions = computed(() => this.gameSpaceOptionsSignal());
  public isLoading = computed(() => this.loadingSignal());

  async loadUserGameSpaces(): Promise<void> {
    this.loadingSignal.set(true);

    try {
      const { data, error } = await this.supabaseService.client
        .from('game_spaces')
        .select(`
          *,
          game_space_members(
            id,
            user_id,
            role,
            joined_at
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading game spaces:', error);
        return;
      }

      // Transform data to include member count
      const gameSpacesWithMembers: GameSpaceWithMembers[] = (data || []).map(space => ({
        ...space,
        member_count: space.game_space_members?.length || 0
      }));

      this.gameSpacesSignal.set(gameSpacesWithMembers);
    } catch (error) {
      console.error('Error in loadUserGameSpaces:', error);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  setCurrentGameSpace(gameSpace: GameSpace | null): void {
    this.currentGameSpaceSignal.set(gameSpace);
  }

  async createGameSpace(request: CreateGameSpaceRequest): Promise<GameSpace | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('game_spaces')
        .insert([request])
        .select()
        .single();

      if (error) {
        console.error('Error creating game space:', error);
        return null;
      }

      // Refresh the list
      await this.loadUserGameSpaces();
      return data;
    } catch (error) {
      console.error('Error in createGameSpace:', error);
      return null;
    }
  }

  async deleteGameSpace(gameSpaceId: string): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.client
        .from('game_spaces')
        .delete()
        .eq('id', gameSpaceId);

      if (error) {
        console.error('Error deleting game space:', error);
        return false;
      }

      // Refresh the list
      await this.loadUserGameSpaces();
      return true;
    } catch (error) {
      console.error('Error in deleteGameSpace:', error);
      return false;
    }
  }

  // Game Session methods
  async loadGameSessions(gameSpaceId: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('game_sessions')
        .select('*')
        .eq('game_space_id', gameSpaceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading game sessions:', error);
        return;
      }

      this.gameSessionsSignal.set(data || []);
    } catch (error) {
      console.error('Error in loadGameSessions:', error);
    }
  }

  async createGameSession(gameSpaceId: string, request: CreateGameSessionRequest): Promise<GameSession | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('game_sessions')
        .insert([{ ...request, game_space_id: gameSpaceId }])
        .select()
        .single();

      if (error) {
        console.error('Error creating game session:', error);
        return null;
      }

      // Refresh the sessions list
      await this.loadGameSessions(gameSpaceId);
      return data;
    } catch (error) {
      console.error('Error in createGameSession:', error);
      return null;
    }
  }

  async updateGameSession(sessionId: string, request: UpdateGameSessionRequest): Promise<GameSession | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('game_sessions')
        .update(request)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating game session:', error);
        return null;
      }

      // Refresh the sessions list if we have current game space
      const currentGameSpace = this.currentGameSpaceSignal();
      if (currentGameSpace) {
        await this.loadGameSessions(currentGameSpace.id);
      }

      return data;
    } catch (error) {
      console.error('Error in updateGameSession:', error);
      return null;
    }
  }

  async deleteGameSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.client
        .from('game_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        console.error('Error deleting game session:', error);
        return false;
      }

      // Refresh the sessions list if we have current game space
      const currentGameSpace = this.currentGameSpaceSignal();
      if (currentGameSpace) {
        await this.loadGameSessions(currentGameSpace.id);
      }

      return true;
    } catch (error) {
      console.error('Error in deleteGameSession:', error);
      return false;
    }
  }

  // Game Space Options methods
  async loadGameSpaceOptions(gameSpaceId: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('game_space_options')
        .select('*')
        .eq('game_space_id', gameSpaceId)
        .eq('is_active', true)
        .order('option_key', { ascending: true });

      if (error) {
        console.error('Error loading game space options:', error);
        return;
      }

      this.gameSpaceOptionsSignal.set(data || []);
    } catch (error) {
      console.error('Error in loadGameSpaceOptions:', error);
    }
  }

  async createGameSpaceOption(gameSpaceId: string, request: CreateGameSpaceOptionRequest): Promise<GameSpaceOption | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('game_space_options')
        .insert([{ ...request, game_space_id: gameSpaceId }])
        .select()
        .single();

      if (error) {
        console.error('Error creating game space option:', error);
        return null;
      }

      // Refresh the options list
      await this.loadGameSpaceOptions(gameSpaceId);
      return data;
    } catch (error) {
      console.error('Error in createGameSpaceOption:', error);
      return null;
    }
  }

  async updateGameSpaceOption(optionId: string, updates: Partial<GameSpaceOption>): Promise<GameSpaceOption | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('game_space_options')
        .update(updates)
        .eq('id', optionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating game space option:', error);
        return null;
      }

      // Refresh the options list if we have current game space
      const currentGameSpace = this.currentGameSpaceSignal();
      if (currentGameSpace) {
        await this.loadGameSpaceOptions(currentGameSpace.id);
      }

      return data;
    } catch (error) {
      console.error('Error in updateGameSpaceOption:', error);
      return null;
    }
  }

  async deleteGameSpaceOption(optionId: string): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.client
        .from('game_space_options')
        .delete()
        .eq('id', optionId);

      if (error) {
        console.error('Error deleting game space option:', error);
        return false;
      }

      // Refresh the options list if we have current game space
      const currentGameSpace = this.currentGameSpaceSignal();
      if (currentGameSpace) {
        await this.loadGameSpaceOptions(currentGameSpace.id);
      }

      return true;
    } catch (error) {
      console.error('Error in deleteGameSpaceOption:', error);
      return false;
    }
  }
}