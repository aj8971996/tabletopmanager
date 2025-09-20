import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase';
import { 
  TextSection,
  Skill,
  CharacterClass,
  DynamicAttribute,
  CreateDynamicAttributeRequest,
  AttributeCalculation,
  CreateAttributeCalculationRequest,
  FormulaDependency,
  CustomSection,
  CreateCustomSectionRequest
} from '../../shared/models';

interface CreateCharacterClassRequest {
  name: string;
  description?: string;
  base_stats: Record<string, number>;
  available_skills?: string[];
  special_abilities?: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class ContentService {
  private supabaseService = inject(SupabaseService);
  
  // Private signals
  private textSectionsSignal = signal<TextSection[]>([]);
  private skillsSignal = signal<Skill[]>([]);
  private characterClassesSignal = signal<CharacterClass[]>([]);
  private dynamicAttributesSignal = signal<DynamicAttribute[]>([]);
  private attributeCalculationsSignal = signal<AttributeCalculation[]>([]);
  private formulaDependenciesSignal = signal<FormulaDependency[]>([]);
  private customSectionsSignal = signal<CustomSection[]>([]);
  private loadingSignal = signal(false);

  // Public computed signals
  public textSections = computed(() => this.textSectionsSignal());
  public skills = computed(() => this.skillsSignal());
  public characterClasses = computed(() => this.characterClassesSignal());
  public dynamicAttributes = computed(() => this.dynamicAttributesSignal());
  public attributeCalculations = computed(() => this.attributeCalculationsSignal());
  public formulaDependencies = computed(() => this.formulaDependenciesSignal());
  public customSections = computed(() => this.customSectionsSignal());
  public isLoading = computed(() => this.loadingSignal());
  
  // Computed for core stats only
  public coreAttributes = computed(() => 
    this.dynamicAttributesSignal().filter(attr => attr.is_core_stat)
  );

  // Text Sections operations
  async loadTextSections(gameSpaceId: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('text_sections')
        .select('*')
        .eq('game_space_id', gameSpaceId)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error loading text sections:', error);
        return;
      }

      this.textSectionsSignal.set(data || []);
    } catch (error) {
      console.error('Error in loadTextSections:', error);
    }
  }

  // Skills operations
  async loadSkills(gameSpaceId: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('skills')
        .select('*')
        .eq('game_space_id', gameSpaceId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading skills:', error);
        return;
      }

      this.skillsSignal.set(data || []);
    } catch (error) {
      console.error('Error in loadSkills:', error);
    }
  }

  // Character Classes operations
  async loadCharacterClasses(gameSpaceId: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('character_classes')
        .select('*')
        .eq('game_space_id', gameSpaceId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading character classes:', error);
        return;
      }

      this.characterClassesSignal.set(data || []);
    } catch (error) {
      console.error('Error in loadCharacterClasses:', error);
    }
  }

  async createCharacterClass(gameSpaceId: string, request: CreateCharacterClassRequest): Promise<CharacterClass | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('character_classes')
        .insert([{ ...request, game_space_id: gameSpaceId }])
        .select()
        .single();

      if (error) {
        console.error('Error creating character class:', error);
        return null;
      }

      // Refresh the classes list
      await this.loadCharacterClasses(gameSpaceId);
      return data;
    } catch (error) {
      console.error('Error in createCharacterClass:', error);
      return null;
    }
  }

  async updateCharacterClass(classId: string, updates: Partial<CharacterClass>): Promise<CharacterClass | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('character_classes')
        .update(updates)
        .eq('id', classId)
        .select()
        .single();

      if (error) {
        console.error('Error updating character class:', error);
        return null;
      }

      // Update the classes list
      const classes = this.characterClassesSignal();
      const updatedClasses = classes.map(cls => 
        cls.id === classId ? data : cls
      );
      this.characterClassesSignal.set(updatedClasses);

      return data;
    } catch (error) {
      console.error('Error in updateCharacterClass:', error);
      return null;
    }
  }

  async deleteCharacterClass(classId: string, gameSpaceId: string): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.client
        .from('character_classes')
        .delete()
        .eq('id', classId);

      if (error) {
        console.error('Error deleting character class:', error);
        return false;
      }

      // Refresh the classes list
      await this.loadCharacterClasses(gameSpaceId);
      return true;
    } catch (error) {
      console.error('Error in deleteCharacterClass:', error);
      return false;
    }
  }

  // Dynamic Attributes operations
  async loadDynamicAttributes(gameSpaceId: string): Promise<void> {
    this.loadingSignal.set(true);

    try {
      const { data, error } = await this.supabaseService.client
        .from('dynamic_attributes')
        .select('*')
        .eq('game_space_id', gameSpaceId)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error loading dynamic attributes:', error);
        return;
      }

      this.dynamicAttributesSignal.set(data || []);
    } catch (error) {
      console.error('Error in loadDynamicAttributes:', error);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async createDynamicAttribute(gameSpaceId: string, request: CreateDynamicAttributeRequest): Promise<DynamicAttribute | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('dynamic_attributes')
        .insert([{ ...request, game_space_id: gameSpaceId }])
        .select()
        .single();

      if (error) {
        console.error('Error creating dynamic attribute:', error);
        return null;
      }

      // Refresh the attributes list
      await this.loadDynamicAttributes(gameSpaceId);
      return data;
    } catch (error) {
      console.error('Error in createDynamicAttribute:', error);
      return null;
    }
  }

  async updateDynamicAttribute(attributeId: string, updates: Partial<DynamicAttribute>): Promise<DynamicAttribute | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('dynamic_attributes')
        .update(updates)
        .eq('id', attributeId)
        .select()
        .single();

      if (error) {
        console.error('Error updating dynamic attribute:', error);
        return null;
      }

      // Update the attributes list
      const attributes = this.dynamicAttributesSignal();
      const updatedAttributes = attributes.map(attr => 
        attr.id === attributeId ? data : attr
      );
      this.dynamicAttributesSignal.set(updatedAttributes);

      return data;
    } catch (error) {
      console.error('Error in updateDynamicAttribute:', error);
      return null;
    }
  }

  async deleteDynamicAttribute(attributeId: string, gameSpaceId: string): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.client
        .from('dynamic_attributes')
        .delete()
        .eq('id', attributeId);

      if (error) {
        console.error('Error deleting dynamic attribute:', error);
        return false;
      }

      // Refresh the attributes list
      await this.loadDynamicAttributes(gameSpaceId);
      return true;
    } catch (error) {
      console.error('Error in deleteDynamicAttribute:', error);
      return false;
    }
  }

  // Attribute Calculations operations
  async loadAttributeCalculations(gameSpaceId: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('attribute_calculations')
        .select('*')
        .eq('game_space_id', gameSpaceId)
        .eq('is_active', true)
        .order('calculation_order', { ascending: true });

      if (error) {
        console.error('Error loading attribute calculations:', error);
        return;
      }

      this.attributeCalculationsSignal.set(data || []);
    } catch (error) {
      console.error('Error in loadAttributeCalculations:', error);
    }
  }

  async createAttributeCalculation(gameSpaceId: string, request: CreateAttributeCalculationRequest): Promise<AttributeCalculation | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('attribute_calculations')
        .insert([{ ...request, game_space_id: gameSpaceId }])
        .select()
        .single();

      if (error) {
        console.error('Error creating attribute calculation:', error);
        return null;
      }

      // Refresh the calculations list
      await this.loadAttributeCalculations(gameSpaceId);
      return data;
    } catch (error) {
      console.error('Error in createAttributeCalculation:', error);
      return null;
    }
  }

  // Formula Dependencies operations
  async loadFormulaDependencies(gameSpaceId: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('formula_dependencies')
        .select('*')
        .eq('game_space_id', gameSpaceId)
        .order('dependent_calculation', { ascending: true });

      if (error) {
        console.error('Error loading formula dependencies:', error);
        return;
      }

      this.formulaDependenciesSignal.set(data || []);
    } catch (error) {
      console.error('Error in loadFormulaDependencies:', error);
    }
  }

  // Custom Sections operations
  async loadCustomSections(gameSpaceId: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('custom_sections')
        .select('*')
        .eq('game_space_id', gameSpaceId)
        .order('section_name', { ascending: true });

      if (error) {
        console.error('Error loading custom sections:', error);
        return;
      }

      this.customSectionsSignal.set(data || []);
    } catch (error) {
      console.error('Error in loadCustomSections:', error);
    }
  }

  async createCustomSection(gameSpaceId: string, request: CreateCustomSectionRequest): Promise<CustomSection | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('custom_sections')
        .insert([{ ...request, game_space_id: gameSpaceId }])
        .select()
        .single();

      if (error) {
        console.error('Error creating custom section:', error);
        return null;
      }

      // Refresh the custom sections list
      await this.loadCustomSections(gameSpaceId);
      return data;
    } catch (error) {
      console.error('Error in createCustomSection:', error);
      return null;
    }
  }

  async updateCustomSection(sectionId: string, updates: Partial<CustomSection>): Promise<CustomSection | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('custom_sections')
        .update(updates)
        .eq('id', sectionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating custom section:', error);
        return null;
      }

      // Update the custom sections list
      const sections = this.customSectionsSignal();
      const updatedSections = sections.map(section => 
        section.id === sectionId ? data : section
      );
      this.customSectionsSignal.set(updatedSections);

      return data;
    } catch (error) {
      console.error('Error in updateCustomSection:', error);
      return null;
    }
  }

  async deleteCustomSection(sectionId: string, gameSpaceId: string): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.client
        .from('custom_sections')
        .delete()
        .eq('id', sectionId);

      if (error) {
        console.error('Error deleting custom section:', error);
        return false;
      }

      // Refresh the custom sections list
      await this.loadCustomSections(gameSpaceId);
      return true;
    } catch (error) {
      console.error('Error in deleteCustomSection:', error);
      return false;
    }
  }

  // Utility methods
  async loadAllGameSpaceContent(gameSpaceId: string): Promise<void> {
    await Promise.all([
      this.loadTextSections(gameSpaceId),
      this.loadSkills(gameSpaceId),
      this.loadCharacterClasses(gameSpaceId),
      this.loadDynamicAttributes(gameSpaceId),
      this.loadAttributeCalculations(gameSpaceId),
      this.loadFormulaDependencies(gameSpaceId),
      this.loadCustomSections(gameSpaceId)
    ]);
  }
}