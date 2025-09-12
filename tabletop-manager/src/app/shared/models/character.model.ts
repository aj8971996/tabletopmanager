export interface Character {
  id: string;
  game_space_id: string;
  name: string;
  character_type: 'pc' | 'npc';
  owner_user_id?: string;
  character_data: Record<string, any>;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCharacterRequest {
  name: string;
  character_type: 'pc' | 'npc';
  character_data?: Record<string, any>;
  notes?: string;
}

export interface CharacterClassAssignment {
  id: string;
  character_id: string;
  class_id: string;
  class_level: number;
  is_primary: boolean;
  experience_points: number;
  class_features: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateCharacterClassAssignmentRequest {
  character_id: string;
  class_id: string;
  class_level?: number;
  is_primary?: boolean;
  experience_points?: number;
  class_features?: Record<string, any>;
}

export interface CharacterCalculatedValue {
  id: string;
  character_id: string;
  attribute_name: string;
  calculated_value: number;
  calculation_timestamp: string;
  is_dirty: boolean;
}

export interface CharacterCreationTemplate {
  id: string;
  game_space_id: string;
  name: string;
  description?: string;
  fields: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateCharacterCreationTemplateRequest {
  name: string;
  description?: string;
  fields: Record<string, any>;
}