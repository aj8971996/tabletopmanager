import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase';
import { 
  GameSpace, 
  GameSpaceWithMembers, 
  CreateGameSpaceRequest 
} from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class GameSpaceService {
  private supabaseService = inject(SupabaseService);
  
  // Private signals
  private gameSpacesSignal = signal<GameSpaceWithMembers[]>([]);
  private currentGameSpaceSignal = signal<GameSpace | null>(null);
  private loadingSignal = signal(false);

  // Public computed signals
  public gameSpaces = computed(() => this.gameSpacesSignal());
  public currentGameSpace = computed(() => this.currentGameSpaceSignal());
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
}