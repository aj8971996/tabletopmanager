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
  CreateGameSpaceOptionRequest,
  CreateDynamicAttributeRequest
} from '../../shared/models';

export interface GameSpaceStats {
  playerCharacters: number;
  npcs: number;
  contentPages: number;
  customAttributes: number;
  activeTrackers: number;
  totalMembers: number;
  activeSessions: number;
  gameSpaceOptions: number;
  lastActivity: string;
}

export interface CharacterStats {
  playerCharacters: number;
  npcs: number;
  totalCharacters: number;
  inactiveCharacters: number;
}

export interface ContentStats {
  totalPages: number;
  rulePages: number;
  lorePages: number;
  generalPages: number;
  customPages: number;
  publicPages: number;
  privatePages: number;
}

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
  private currentGameSpaceStatsSignal = signal<GameSpaceStats | null>(null);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);

  // Public computed signals
  public gameSpaces = computed(() => this.gameSpacesSignal());
  public currentGameSpace = computed(() => this.currentGameSpaceSignal());
  public gameSessions = computed(() => this.gameSessionsSignal());
  public gameSpaceOptions = computed(() => this.gameSpaceOptionsSignal());
  public currentGameSpaceStats = computed(() => this.currentGameSpaceStatsSignal());
  public isLoading = computed(() => this.loadingSignal());
  public error = computed(() => this.errorSignal());

  constructor() {
    this.loadUserGameSpaces();
  }

  async loadUserGameSpaces(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      // Get current user first
      const { data: { user } } = await this.supabaseService.client.auth.getUser();
      
      if (!user) {
        console.warn('No authenticated user found');
        this.gameSpacesSignal.set([]);
        return;
      }

      // Approach 1: Get game spaces where user is GM
      const { data: ownedSpaces, error: ownedError } = await this.supabaseService.client
        .from('game_spaces')
        .select(`
          *,
          game_space_members!left(
            id,
            user_id,
            role,
            joined_at
          )
        `)
        .eq('gm_user_id', user.id)
        .order('updated_at', { ascending: false });

      if (ownedError) {
        console.error('Error loading owned game spaces:', ownedError);
        this.errorSignal.set('Failed to load game spaces');
        return;
      }

      // Approach 2: Get game spaces where user is a member
      const { data: memberSpaces, error: memberError } = await this.supabaseService.client
        .from('game_spaces')
        .select(`
          *,
          game_space_members!inner(
            id,
            user_id,
            role,
            joined_at
          )
        `)
        .eq('game_space_members.user_id', user.id)
        .order('updated_at', { ascending: false });

      if (memberError) {
        console.error('Error loading member game spaces:', memberError);
        // Continue with just owned spaces
      }

      // Combine and deduplicate results
      const allSpaces = [...(ownedSpaces || [])];
      
      // Add member spaces that aren't already in owned spaces
      if (memberSpaces) {
        memberSpaces.forEach(memberSpace => {
          if (!allSpaces.find(space => space.id === memberSpace.id)) {
            allSpaces.push(memberSpace);
          }
        });
      }

      // Sort by updated_at descending
      allSpaces.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      // Transform data to include member count and user role
      const gameSpacesWithMembers: GameSpaceWithMembers[] = allSpaces.map(space => {
        const members = space.game_space_members || [];
        
        // Determine user's role: GM if they own it, otherwise get from members
        let userRole: 'gm' | 'player' = 'player';
        if (space.gm_user_id === user.id) {
          userRole = 'gm';
        } else {
          const membership = members.find((m: { user_id: string; }) => m.user_id === user.id);
          userRole = membership?.role || 'player';
        }

        // Check if GM has a membership record
        const gmHasMembershipRecord = members.some((m: { user_id: any; }) => m.user_id === space.gm_user_id);
        
        // If GM has membership record, just count members
        // If GM doesn't have membership record, add 1 for the GM
        const memberCount = gmHasMembershipRecord 
          ? members.length 
          : members.length + 1;

        return {
          ...space,
          member_count: memberCount,
          user_role: userRole
        };
      });

      this.gameSpacesSignal.set(gameSpacesWithMembers);
    } catch (error) {
      console.error('Error in loadUserGameSpaces:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to load game spaces');
    } finally {
      this.loadingSignal.set(false);
    }
  }

  setCurrentGameSpace(gameSpace: GameSpace | null): void {
    this.currentGameSpaceSignal.set(gameSpace);
    // Load stats for the newly selected game space
    if (gameSpace) {
      this.loadGameSpaceStats(gameSpace.id);
    } else {
      this.currentGameSpaceStatsSignal.set(null);
    }
  }

  /**
   * Get comprehensive statistics for a game space using the database function
   */
  async loadGameSpaceStats(gameSpaceId: string): Promise<GameSpaceStats | null> {
    try {
      this.errorSignal.set(null);

      const { data, error } = await this.supabaseService.client
        .rpc('get_game_space_stats_simple', { target_game_space_id: gameSpaceId });

      if (error) {
        console.error('Stats function error:', error);
        throw error;
      }

      const stats: GameSpaceStats = data;
      this.currentGameSpaceStatsSignal.set(stats);
      return stats;
    } catch (error) {
      console.error('Error loading game space stats:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to load game space stats');
      
      // Set default stats if there's an error
      const defaultStats: GameSpaceStats = {
        playerCharacters: 0,
        npcs: 0,
        contentPages: 0,
        customAttributes: 0,
        activeTrackers: 0,
        totalMembers: 0,
        activeSessions: 0,
        gameSpaceOptions: 0,
        lastActivity: new Date().toISOString()
      };
      this.currentGameSpaceStatsSignal.set(defaultStats);
      return defaultStats;
    }
  }

  /**
   * Get lightweight character statistics
   */
  async getCharacterStats(gameSpaceId: string): Promise<CharacterStats | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .rpc('get_character_counts', { target_game_space_id: gameSpaceId });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error loading character stats:', error);
      return null;
    }
  }

  /**
   * Get detailed content statistics
   */
  async getContentStats(gameSpaceId: string): Promise<ContentStats | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .rpc('get_content_stats', { target_game_space_id: gameSpaceId });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error loading content stats:', error);
      return null;
    }
  }

  async createGameSpace(request: CreateGameSpaceRequest): Promise<GameSpace | null> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      // Get current user
      const { data: { user } } = await this.supabaseService.client.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user found');
        this.errorSignal.set('User not authenticated');
        return null;
      }

      // Create the game space with GM user ID - no membership record needed
      const gameSpaceData = {
        ...request,
        gm_user_id: user.id
      };

      const { data: gameSpace, error: gameSpaceError } = await this.supabaseService.client
        .from('game_spaces')
        .insert([gameSpaceData])
        .select()
        .single();

      if (gameSpaceError) {
        console.error('Error creating game space:', gameSpaceError);
        this.errorSignal.set('Failed to create game space');
        return null;
      }

      // Refresh the list to show the new game space
      await this.loadUserGameSpaces();
      return gameSpace;
    } catch (error) {
      console.error('Error in createGameSpace:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to create game space');
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async createGameSpaceWithTemplate(
    request: CreateGameSpaceRequest, 
    templateAttributes: Array<{
      name: string;
      label: string;
      min: number;
      max: number;
      default: number;
    }>
  ): Promise<GameSpace | null> {
    try {
      // First create the basic game space
      const gameSpace = await this.createGameSpace(request);
      
      if (!gameSpace) {
        return null;
      }

      // Create dynamic attributes from template
      if (templateAttributes.length > 0) {
        const attributeRequests: CreateDynamicAttributeRequest[] = templateAttributes.map((attr, index) => ({
          attribute_name: attr.name,
          attribute_label: attr.label,
          calculation_type: 'static',
          base_value: attr.default,
          min_value: attr.min,
          max_value: attr.max,
          display_order: index,
          is_core_stat: true,
          description: `${attr.label} attribute for character stats`
        }));

        // Insert all attributes
        const { error: attributesError } = await this.supabaseService.client
          .from('dynamic_attributes')
          .insert(
            attributeRequests.map(req => ({
              ...req,
              game_space_id: gameSpace.id
            }))
          );

        if (attributesError) {
          console.error('Error creating dynamic attributes:', attributesError);
          // Game space is created but attributes failed
        }
      }

      return gameSpace;
    } catch (error) {
      console.error('Error in createGameSpaceWithTemplate:', error);
      return null;
    }
  }

  async updateGameSpace(id: string, updates: Partial<GameSpace>): Promise<GameSpace | null> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const { data, error } = await this.supabaseService.client
        .from('game_spaces')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update current game space if it's the one being updated
      if (this.currentGameSpace()?.id === id) {
        this.currentGameSpaceSignal.set(data);
      }

      // Refresh the list
      await this.loadUserGameSpaces();

      return data;
    } catch (error) {
      console.error('Error updating game space:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to update game space');
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async deleteGameSpace(gameSpaceId: string): Promise<boolean> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      // Get current user to verify they can delete this game space
      const { data: { user } } = await this.supabaseService.client.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user found');
        this.errorSignal.set('User not authenticated');
        return false;
      }

      // Verify user is the GM of this game space
      const { data: gameSpace, error: fetchError } = await this.supabaseService.client
        .from('game_spaces')
        .select('gm_user_id')
        .eq('id', gameSpaceId)
        .single();

      if (fetchError || !gameSpace) {
        console.error('Error fetching game space:', fetchError);
        this.errorSignal.set('Game space not found');
        return false;
      }

      if (gameSpace.gm_user_id !== user.id) {
        console.error('User is not the GM of this game space');
        this.errorSignal.set('Permission denied');
        return false;
      }

      // Delete the game space (cascade will handle related records)
      const { error } = await this.supabaseService.client
        .from('game_spaces')
        .delete()
        .eq('id', gameSpaceId);

      if (error) {
        console.error('Error deleting game space:', error);
        this.errorSignal.set('Failed to delete game space');
        return false;
      }

      // Clear current game space if it was deleted
      if (this.currentGameSpace()?.id === gameSpaceId) {
        this.currentGameSpaceSignal.set(null);
        this.currentGameSpaceStatsSignal.set(null);
      }

      // Refresh the list
      await this.loadUserGameSpaces();
      return true;
    } catch (error) {
      console.error('Error in deleteGameSpace:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to delete game space');
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  // Check if current user is GM of a game space (simplified - check ownership)
  async isCurrentUserGM(gameSpaceId: string): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabaseService.client.auth.getUser();
      
      if (!user) return false;

      // Check if user is the GM (owner) of the game space
      const { data, error } = await this.supabaseService.client
        .from('game_spaces')
        .select('gm_user_id')
        .eq('id', gameSpaceId)
        .eq('gm_user_id', user.id)
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('Error checking GM status:', error);
      return false;
    }
  }

  // Helper method to add players as members (not the GM)
  async addPlayerMember(gameSpaceId: string, userId: string, role: 'player' = 'player'): Promise<boolean> {
    try {
      // Verify current user is GM
      const isGM = await this.isCurrentUserGM(gameSpaceId);
      if (!isGM) {
        console.error('Only GMs can add members');
        this.errorSignal.set('Permission denied');
        return false;
      }

      const { error } = await this.supabaseService.client
        .from('game_space_members')
        .upsert([{
          game_space_id: gameSpaceId,
          user_id: userId,
          role: role
        }], {
          onConflict: 'game_space_id,user_id'
        });

      if (error) {
        console.error('Error adding member:', error);
        this.errorSignal.set('Failed to add member');
        return false;
      }

      // Refresh stats to reflect new member count
      await this.loadGameSpaceStats(gameSpaceId);
      return true;
    } catch (error) {
      console.error('Error in addPlayerMember:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to add member');
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

      // Refresh the sessions list and stats
      await this.loadGameSessions(gameSpaceId);
      await this.loadGameSpaceStats(gameSpaceId);
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
        await this.loadGameSpaceStats(currentGameSpace.id);
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
        await this.loadGameSpaceStats(currentGameSpace.id);
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

      // Refresh stats
      await this.loadGameSpaceStats(gameSpaceId);
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
        await this.loadGameSpaceStats(currentGameSpace.id);
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
        await this.loadGameSpaceStats(currentGameSpace.id);
      }

      return true;
    } catch (error) {
      console.error('Error in deleteGameSpaceOption:', error);
      return false;
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.errorSignal.set(null);
  }
}