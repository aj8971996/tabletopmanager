export interface TextSection {
  id: string;
  game_space_id: string;
  title: string;
  content?: string;
  section_type: 'rules' | 'lore' | 'general' | 'custom';
  order_index: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  game_space_id: string;
  name: string;
  description?: string;
  skill_type: string;
  requirements: Record<string, any>;
  effects: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CharacterClass {
  id: string;
  game_space_id: string;
  name: string;
  description?: string;
  base_stats: Record<string, any>;
  available_skills: string[];
  special_abilities: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DynamicAttribute {
  id: string;
  game_space_id: string;
  attribute_name: string;
  attribute_label: string;
  calculation_type: 'static' | 'calculated' | 'dice_based';
  base_value: number;
  calculation_formula?: string;
  min_value: number;
  max_value: number;
  display_order: number;
  is_core_stat: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDynamicAttributeRequest {
  attribute_name: string;
  attribute_label: string;
  calculation_type?: 'static' | 'calculated' | 'dice_based';
  base_value?: number;
  calculation_formula?: string;
  min_value?: number;
  max_value?: number;
  display_order?: number;
  is_core_stat?: boolean;
  description?: string;
}

export interface AttributeCalculation {
  id: string;
  game_space_id: string;
  calculation_name: string;
  attribute_label: string;
  base_attributes: string[];
  calculation_formula: string;
  dice_formula?: string;
  calculation_order: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAttributeCalculationRequest {
  calculation_name: string;
  attribute_label: string;
  base_attributes: string[];
  calculation_formula: string;
  dice_formula?: string;
  calculation_order?: number;
  description?: string;
  is_active?: boolean;
}

export interface FormulaDependency {
  id: string;
  game_space_id: string;
  dependent_calculation: string;
  required_attribute: string;
  dependency_type: 'attribute' | 'calculation' | 'stat';
  created_at: string;
}

export interface CustomSection {
  id: string;
  game_space_id: string;
  section_name: string;
  section_config: Record<string, any>;
  data: Record<string, any>;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomSectionRequest {
  section_name: string;
  section_config: Record<string, any>;
  data: Record<string, any>;
  is_public?: boolean;
}