import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase';
import { 
  Character,
  CreateCharacterRequest,
  CharacterClassAssignment,
  CreateCharacterClassAssignmentRequest,
  CharacterCalculatedValue,
  CharacterCreationTemplate,
  CreateCharacterCreationTemplateRequest
} from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class CharacterService {
  private supabaseService = inject(SupabaseService);
  
  // Private signals
  private charactersSignal = signal<Character[]>([]);
  private characterClassAssignmentsSignal = signal<CharacterClassAssignment[]>([]);
  private characterCalculatedValuesSignal = signal<CharacterCalculatedValue[]>([]);
  private characterCreationTemplatesSignal = signal<CharacterCreationTemplate[]>([]);
  private currentCharacterSignal = signal<Character | null>(null);
  private loadingSignal = signal(false);

  // Public computed signals
  public characters = computed(() => this.charactersSignal());
  public characterClassAssignments = computed(() => this.characterClassAssignmentsSignal());
  public characterCalculatedValues = computed(() => this.characterCalculatedValuesSignal());
  public characterCreationTemplates = computed(() => this.characterCreationTemplatesSignal());
  public currentCharacter = computed(() => this.currentCharacterSignal());
  public isLoading = computed(() => this.loadingSignal());

  // Character CRUD operations
  async loadCharacters(gameSpaceId: string): Promise<void> {
    this.loadingSignal.set(true);

    try {
      const { data, error } = await this.supabaseService.client
        .from('characters')
        .select('*')
        .eq('game_space_id', gameSpaceId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading characters:', error);
        return;
      }

      this.charactersSignal.set(data || []);
    } catch (error) {
      console.error('Error in loadCharacters:', error);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async createCharacter(gameSpaceId: string, request: CreateCharacterRequest): Promise<Character | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('characters')
        .insert([{ ...request, game_space_id: gameSpaceId }])
        .select()
        .single();

      if (error) {
        console.error('Error creating character:', error);
        return null;
      }

      // Refresh the characters list
      await this.loadCharacters(gameSpaceId);
      return data;
    } catch (error) {
      console.error('Error in createCharacter:', error);
      return null;
    }
  }

  async updateCharacter(characterId: string, updates: Partial<Character>): Promise<Character | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('characters')
        .update(updates)
        .eq('id', characterId)
        .select()
        .single();

      if (error) {
        console.error('Error updating character:', error);
        return null;
      }

      // Update the characters list
      const characters = this.charactersSignal();
      const updatedCharacters = characters.map(char => 
        char.id === characterId ? data : char
      );
      this.charactersSignal.set(updatedCharacters);

      // Update current character if it matches
      const currentCharacter = this.currentCharacterSignal();
      if (currentCharacter?.id === characterId) {
        this.currentCharacterSignal.set(data);
      }

      return data;
    } catch (error) {
      console.error('Error in updateCharacter:', error);
      return null;
    }
  }

  async deleteCharacter(characterId: string): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.client
        .from('characters')
        .update({ is_active: false })
        .eq('id', characterId);

      if (error) {
        console.error('Error deleting character:', error);
        return false;
      }

      // Remove from current list
      const characters = this.charactersSignal();
      const updatedCharacters = characters.filter(char => char.id !== characterId);
      this.charactersSignal.set(updatedCharacters);

      // Clear current character if it matches
      const currentCharacter = this.currentCharacterSignal();
      if (currentCharacter?.id === characterId) {
        this.currentCharacterSignal.set(null);
      }

      return true;
    } catch (error) {
      console.error('Error in deleteCharacter:', error);
      return false;
    }
  }

  setCurrentCharacter(character: Character | null): void {
    this.currentCharacterSignal.set(character);
  }

  // Character Class Assignment operations
  async loadCharacterClassAssignments(characterId: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('character_class_assignments')
        .select('*')
        .eq('character_id', characterId)
        .order('is_primary', { ascending: false });

      if (error) {
        console.error('Error loading character class assignments:', error);
        return;
      }

      this.characterClassAssignmentsSignal.set(data || []);
    } catch (error) {
      console.error('Error in loadCharacterClassAssignments:', error);
    }
  }

  async createCharacterClassAssignment(request: CreateCharacterClassAssignmentRequest): Promise<CharacterClassAssignment | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('character_class_assignments')
        .insert([request])
        .select()
        .single();

      if (error) {
        console.error('Error creating character class assignment:', error);
        return null;
      }

      // Refresh the assignments list
      await this.loadCharacterClassAssignments(request.character_id);
      return data;
    } catch (error) {
      console.error('Error in createCharacterClassAssignment:', error);
      return null;
    }
  }

  // Character Calculated Values operations
  async loadCharacterCalculatedValues(characterId: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('character_calculated_values')
        .select('*')
        .eq('character_id', characterId)
        .order('attribute_name', { ascending: true });

      if (error) {
        console.error('Error loading character calculated values:', error);
        return;
      }

      this.characterCalculatedValuesSignal.set(data || []);
    } catch (error) {
      console.error('Error in loadCharacterCalculatedValues:', error);
    }
  }

  async recalculateCharacterValues(characterId: string): Promise<void> {
    try {
      // Mark all calculated values as dirty for recalculation
      const { error } = await this.supabaseService.client
        .from('character_calculated_values')
        .update({ is_dirty: true })
        .eq('character_id', characterId);

      if (error) {
        console.error('Error marking calculated values as dirty:', error);
        return;
      }

      // Reload the calculated values
      await this.loadCharacterCalculatedValues(characterId);
    } catch (error) {
      console.error('Error in recalculateCharacterValues:', error);
    }
  }

  // Character Creation Templates operations
  async loadCharacterCreationTemplates(gameSpaceId: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('character_creation_templates')
        .select('*')
        .eq('game_space_id', gameSpaceId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading character creation templates:', error);
        return;
      }

      this.characterCreationTemplatesSignal.set(data || []);
    } catch (error) {
      console.error('Error in loadCharacterCreationTemplates:', error);
    }
  }

  async createCharacterCreationTemplate(gameSpaceId: string, request: CreateCharacterCreationTemplateRequest): Promise<CharacterCreationTemplate | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('character_creation_templates')
        .insert([{ ...request, game_space_id: gameSpaceId }])
        .select()
        .single();

      if (error) {
        console.error('Error creating character creation template:', error);
        return null;
      }

      // Refresh the templates list
      await this.loadCharacterCreationTemplates(gameSpaceId);
      return data;
    } catch (error) {
      console.error('Error in createCharacterCreationTemplate:', error);
      return null;
    }
  }

  async updateCharacterCreationTemplate(templateId: string, updates: Partial<CharacterCreationTemplate>): Promise<CharacterCreationTemplate | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('character_creation_templates')
        .update(updates)
        .eq('id', templateId)
        .select()
        .single();

      if (error) {
        console.error('Error updating character creation template:', error);
        return null;
      }

      // Update the templates list
      const templates = this.characterCreationTemplatesSignal();
      const updatedTemplates = templates.map(template => 
        template.id === templateId ? data : template
      );
      this.characterCreationTemplatesSignal.set(updatedTemplates);

      return data;
    } catch (error) {
      console.error('Error in updateCharacterCreationTemplate:', error);
      return null;
    }
  }

  async deleteCharacterCreationTemplate(templateId: string, gameSpaceId: string): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.client
        .from('character_creation_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        console.error('Error deleting character creation template:', error);
        return false;
      }

      // Refresh the templates list
      await this.loadCharacterCreationTemplates(gameSpaceId);
      return true;
    } catch (error) {
      console.error('Error in deleteCharacterCreationTemplate:', error);
      return false;
    }
  }
}